/**
 * API Client for Cricket Fantasy Game
 * Centralized service for all backend API calls
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || error.message || 'An error occurred')
  }
  return response.json()
}

// API Client
export const api = {
  // ==================== AUTH ====================
  auth: {
    register: async (data: { name: string; email: string; password: string }) => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{
        token: string
        user: { id: string; name: string; email: string }
        message: string
      }>(response)
    },

    login: async (data: { email: string; password: string }) => {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return handleResponse<{
        token: string
        user: { id: string; name: string; email: string }
        message: string
      }>(response)
    },
  },

  // ==================== SERIES ====================
  series: {
    getAll: async () => {
      const response = await fetch(`${API_URL}/series`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<{
          id: string
          name: string
          format: string
          gender: string
          teams: string[]
          startDate: string
          endDate: string
          status: string
        }>
      }>(response)
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_URL}/series/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse(response)
    },
  },

  // ==================== TOURNAMENTS ====================
  tournaments: {
    create: async (data: { name: string; seriesId: string; scoringRules?: any }) => {
      const response = await fetch(`${API_URL}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      })
      return handleResponse<{
        success: boolean
        data: {
          id: string
          name: string
          code: string
          seriesId: string
        }
        message: string
      }>(response)
    },

    join: async (code: string) => {
      // First, find tournament by code
      // Since backend expects tournament ID, we need to handle the code lookup
      const response = await fetch(`${API_URL}/tournaments/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ code }),
      })
      return handleResponse<{
        success: boolean
        data: { tournamentId: string }
        message: string
      }>(response)
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_URL}/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse(response)
    },

    getUserTournaments: async () => {
      const response = await fetch(`${API_URL}/tournaments/user/list`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<any>
      }>(response)
    },

    updateRules: async (id: string, scoringRules: any) => {
      const response = await fetch(`${API_URL}/tournaments/${id}/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ scoringRules }),
      })
      return handleResponse(response)
    },

    lockRules: async (id: string) => {
      const response = await fetch(`${API_URL}/tournaments/${id}/lock-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })
      return handleResponse<{
        success: boolean
        data: { allLocked: boolean }
        message: string
      }>(response)
    },

    startAuction: async (id: string) => {
      const response = await fetch(`${API_URL}/tournaments/${id}/start-auction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })
      return handleResponse(response)
    },

    deleteTournament: async (id: string) => {
      const response = await fetch(`${API_URL}/tournaments/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })
      return handleResponse<{
        success: boolean
        message: string
      }>(response)
    },

    getLeaderboard: async (id: string, matchId?: string) => {
      const url = matchId
        ? `${API_URL}/tournaments/${id}/leaderboard?matchId=${matchId}`
        : `${API_URL}/tournaments/${id}/leaderboard`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse(response)
    },
  },

  // ==================== AUCTION ====================
  auction: {
    getPlayers: async (tournamentId: string) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/players`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<any>
      }>(response)
    },

    placeBid: async (tournamentId: string, playerId: string, amount: number) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ playerId, amount }),
      })
      return handleResponse(response)
    },

    getAllTeams: async (tournamentId: string) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/teams`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<any>
      }>(response)
    },

    getMyTeam: async (tournamentId: string) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/my-team`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: any
      }>(response)
    },

    setCaptain: async (
      tournamentId: string,
      captainId: string | null,
      viceCaptainId: string | null
    ) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/captain`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ captainId, viceCaptainId }),
      })
      return handleResponse(response)
    },

    completePlayerAuction: async (tournamentId: string, playerId: string) => {
      const response = await fetch(`${API_URL}/auction/${tournamentId}/complete/${playerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })
      return handleResponse(response)
    },
  },

  // ==================== MATCHES ====================
  matches: {
    getSeriesMatches: async (seriesId: string) => {
      const response = await fetch(`${API_URL}/matches/series/${seriesId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<any>
      }>(response)
    },

    getById: async (id: string) => {
      const response = await fetch(`${API_URL}/matches/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse(response)
    },

    getScores: async (id: string) => {
      const response = await fetch(`${API_URL}/matches/${id}/scores`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      return handleResponse<{
        success: boolean
        data: Array<any>
      }>(response)
    },
  },
}

export default api

