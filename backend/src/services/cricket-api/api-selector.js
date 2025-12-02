const CricAPIProvider = require('./providers/cricapi-provider');
const CricbuzzProvider = require('./providers/cricbuzz-provider');
const CricketDataProvider = require('./providers/cricketdata-provider');
const RapidAPICricbuzzProvider = require('./providers/rapidapi-cricbuzz-provider');
const UnofficialCricbuzzProvider = require('./providers/unofficial-cricbuzz-provider');
const apiUsageTracker = require('./api-usage-tracker');

/**
 * API Selector Service
 * Intelligently selects the best API provider based on:
 * - Usage limits
 * - Request type (static vs live data)
 * - Provider reliability
 * - Error history
 */
class ApiSelector {
  constructor() {
    this.providers = null;
    this.initialized = false;
  }

  /**
   * Initialize all API providers
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize API usage tracker
      await apiUsageTracker.initialize();

      // Initialize providers
      this.providers = {
        cricketdata: new CricketDataProvider(process.env.CRICKETDATA_API_KEY),
        cricapi: new CricAPIProvider(process.env.CRICAPI_KEY),
        rapidapi: new RapidAPICricbuzzProvider(process.env.RAPIDAPI_KEY, process.env.RAPIDAPI_HOST),
        cricbuzz: new CricbuzzProvider(),
        unofficial: new UnofficialCricbuzzProvider(process.env.UNOFFICIAL_CRICBUZZ_API_KEY)
      };

      // Filter out disabled providers
      const enableCricketData = process.env.ENABLE_CRICKETDATA !== 'false';
      const enableCricapi = process.env.ENABLE_CRICAPI !== 'false';
      const enableRapidAPI = process.env.ENABLE_RAPIDAPI === 'true';
      const enableCricbuzz = process.env.ENABLE_CRICBUZZ !== 'false';

      if (!enableCricketData) {
        this.providers.cricketdata = null;
      }

      if (!enableCricapi) {
        this.providers.cricapi = null;
      }

      if (!enableRapidAPI) {
        this.providers.rapidapi = null;
      }

      if (!enableCricbuzz) {
        this.providers.cricbuzz = null;
      }

      this.initialized = true;
      
      const activeProviders = Object.keys(this.providers).filter(k => this.providers[k] !== null);
      console.log('[API Selector] ✅ Initialized with providers:', activeProviders);
      
      // Log each provider's status
      for (const [name, provider] of Object.entries(this.providers)) {
        if (provider && provider.isEnabled) {
          console.log(`  ✅ [${provider.name}] Enabled (API Key: ${provider.apiKey ? '✓' : '✗'})`);
        } else if (provider) {
          console.log(`  ⚠️  [${provider.name}] Disabled`);
        }
      }
    } catch (error) {
      console.error('[API Selector] ❌ Initialization failed:', error.message);
    }
  }

  /**
   * Select best provider for a request type
   * @param {string} requestType - 'series', 'match', 'squad', 'player', 'liveScore'
   * @param {string} priority - 'balanced', 'fast', 'reliable'
   * @returns {Object} Selected provider and metadata
   */
  async selectProvider(requestType, priority = 'balanced') {
    await this.initialize();

    console.log(`[API Selector] 🎯 Selecting provider for: ${requestType} (priority: ${priority})`);

    // Define provider priority based on request type
    const providerPriority = this.getProviderPriority(requestType);

    // Try each provider in order
    for (const providerName of providerPriority) {
      const provider = this.providers[providerName];
      
      if (!provider) {
        console.log(`[API Selector] ⏭️  ${providerName} not available`);
        continue;
      }

      // Check if provider has quota
      const hasQuota = await apiUsageTracker.hasQuota(providerName);
      
      if (!hasQuota) {
        console.log(`[API Selector] ⏭️  ${providerName} quota exhausted`);
        continue;
      }

      // Check if provider is enabled
      if (!provider.isEnabled) {
        console.log(`[API Selector] ⏭️  ${providerName} disabled`);
        continue;
      }

      console.log(`[API Selector] ✅ Selected: ${providerName}`);
      
      return {
        provider: provider,
        providerName: providerName,
        requestType: requestType
      };
    }

    // Fallback: Use Cricbuzz even if quota is exhausted (it's unlimited)
    if (this.providers.cricbuzz && this.providers.cricbuzz.isEnabled) {
      console.log(`[API Selector] ⚠️  Using Cricbuzz as last resort`);
      return {
        provider: this.providers.cricbuzz,
        providerName: 'cricbuzz',
        requestType: requestType,
        isLastResort: true
      };
    }

    // All providers failed
    console.error(`[API Selector] ❌ No available provider for ${requestType}`);
    throw new Error(`No available API provider for ${requestType}`);
  }

  /**
   * Get provider priority based on request type
   */
  getProviderPriority(requestType) {
    // Strategy:
    // - Unofficial Cricbuzz ONLY for series, squads, players, matches
    // - Fallback removed to avoid API quota waste and inconsistent data formats
    // - RapidAPI Cricbuzz for player stats (pre-auction tier calculation)
    // - CrickkAPI for dynamic stats (during auction) - handled separately

    switch (requestType) {
      case 'series':
      case 'squad':
        // Use Unofficial Cricbuzz ONLY (no fallbacks - saves quota, consistent data)
        return ['unofficial'];

      case 'match':
        // Match data - Use Unofficial Cricbuzz ONLY (no fallbacks - consistent format)
        return ['unofficial'];

      case 'player':
        // Player list - use Unofficial Cricbuzz ONLY (no fallbacks - squad-based)
        return ['unofficial'];

      case 'playerStats':
        // Player stats - use RapidAPI Cricbuzz (career stats for tier calculation)
        return ['rapidapi', 'cricketdata', 'cricapi'];

      case 'liveScore':
        // Live scorecard - Use Unofficial Cricbuzz ONLY (consistent format for fantasy points)
        return ['unofficial'];

      default:
        // Default priority
        return ['unofficial', 'cricketdata', 'cricapi', 'rapidapi', 'cricbuzz'];
    }
  }

  /**
   * Execute request with automatic fallback
   * @param {string} requestType - Type of request
   * @param {string} method - Provider method to call (e.g., 'fetchSeries')
   * @param {Array} args - Arguments to pass to method
   * @returns {Object} Response data with metadata
   */
  async executeWithFallback(requestType, method, args = []) {
    await this.initialize();

    const maxAttempts = 4; // Try up to 4 providers
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Select provider
        const { provider, providerName, isLastResort } = await this.selectProvider(requestType);

        console.log(`[API Selector] 📡 Attempt ${attempt}: Calling ${providerName}.${method}()`);

        // Check if provider has the method
        if (typeof provider[method] !== 'function') {
          console.warn(`[API Selector] ⚠️  ${providerName} doesn't implement ${method}()`);
          await apiUsageTracker.disableApi(providerName, `Missing method: ${method}`);
          continue;
        }

        // Execute request
        const startTime = Date.now();
        const data = await provider[method](...args);
        const duration = Date.now() - startTime;

        // Record successful call
        await apiUsageTracker.recordCall(providerName, true);

        console.log(`[API Selector] ✅ Success via ${providerName} (${duration}ms)`);

        return {
          success: true,
          data: data,
          provider: providerName,
          duration: duration,
          attempt: attempt,
          cached: false
        };

      } catch (error) {
        lastError = error;
        
        console.error(`[API Selector] ❌ Attempt ${attempt} failed:`, error.message);

        // Record error
        if (error.provider) {
          await apiUsageTracker.recordError(error.provider);
        }

        // Continue to next provider
        continue;
      }
    }

    // All attempts failed
    console.error(`[API Selector] ❌ All providers failed for ${requestType}.${method}()`);
    throw new Error(`All API providers failed: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Get provider health summary
   */
  async getHealthSummary() {
    await this.initialize();

    const health = await apiUsageTracker.getHealthStatus();
    
    return {
      timestamp: new Date(),
      providers: health,
      summary: {
        total: health.length,
        active: health.filter(p => p.active).length,
        disabled: health.filter(p => !p.active).length,
        exhausted: health.filter(p => p.status === '🔴 Exhausted').length
      }
    };
  }
}

module.exports = new ApiSelector();

