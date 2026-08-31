

const BASE_URL = '/api'

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Import dynamique du store pour éviter les imports circulaires
  const { useAuthStore } = await import('@/stores/authStore')
  const token = useAuthStore.getState().token

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()

  if (!response.ok) {
    // Token expiré ou invalide — déconnexion automatique
    if (response.status === 401) {
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    const message = data?.error ?? data?.message ?? 'Erreur serveur'
    throw new ApiError(response.status, message)
  }

  return data as T
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}


export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: email, password }),
    }),

  me: () =>
    request<import('@/types').AuthUser>('/auth/me'),

  updateProfile: (data: {
    firstName?: string
    lastName?: string
    email?: string
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }) =>
    request<import('@/types').AuthUser>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}


export const projectApi = {
  list: () =>
    request<import('@/types').ProjectSummary[]>('/projects'),

  create: (name: string, description: string) =>
    request<import('@/types').ProjectSummary>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  update: (id: number, name: string, description: string) =>
    request<import('@/types').ProjectSummary>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    }),

  delete: (id: number) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),
}


export const companyApi = {
  get: (id: number) =>
    request<import('@/types').CompanyFull>(`/companies/${id}`),

  create: (projectId: number, name: string, secteur: string, promoteur: string) =>
    request<import('@/types').CompanySummary>(`/projects/${projectId}/companies`, {
      method: 'POST',
      body: JSON.stringify({ name, secteur, promoteur }),
    }),

  updateMeta: (id: number, data: {
    name: string
    secteur: string
    promoteur: string
    descriptionActivite?: string | null
    marche?: string | null
    genre?: 'femme' | 'homme' | null
    modeleEconomique?: ('production' | 'service')[] | null
    etatActivite?: 'existante' | 'nouvelle' | null
  }) =>
    request<import('@/types').CompanySummary>(`/companies/${id}/meta`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateSettings: (id: number, data: import('@/types').CompanySettings) =>
    request<import('@/types').CompanySettings>(`/companies/${id}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  duplicate: (id: number) =>
    request<import('@/types').CompanySummary>(`/companies/${id}/duplicate`, {
      method: 'POST',
    }),

  delete: (id: number) =>
    request<void>(`/companies/${id}`, { method: 'DELETE' }),

  validate: (id: number) =>
    request<{ isValidated: boolean; validatedAt: string; validatedBy: { id: number; fullName: string } | null }>(`/companies/${id}/validate`, { method: 'PATCH' }),

  unvalidate: (id: number) =>
    request<{ isValidated: boolean }>(`/companies/${id}/unvalidate`, { method: 'PATCH' }),
}


export const productApi = {
  create: (
    companyId: number,
    data: { name: string; monthlyPrice?: number[]; monthlyQty?: number[]; growthRates?: number[] },
  ) =>
    request<import('@/types').Product>(`/companies/${companyId}/products`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').Product>) =>
    request<import('@/types').Product>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/products/${id}`, { method: 'DELETE' }),
}

export const materialApi = {
  create: (
    companyId: number,
    data: { name: string; monthlyUnitCost?: number[]; monthlyQty?: number[]; growthRates?: number[] },
  ) =>
    request<import('@/types').Material>(`/companies/${companyId}/materials`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').Material>) =>
    request<import('@/types').Material>(`/materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/materials/${id}`, { method: 'DELETE' }),
}


export const staffMemberApi = {
  create: (
    companyId: number,
    data: { roleName: string; monthlySalary?: number; headcount?: number; chargesRate?: number },
  ) =>
    request<import('@/types').StaffMember>(`/companies/${companyId}/staff-members`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').StaffMember>) =>
    request<import('@/types').StaffMember>(`/staff-members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/staff-members/${id}`, { method: 'DELETE' }),
}


export const expenseApi = {
  create: (
    companyId: number,
    data: { name: string; monthlyAmounts?: number[]; seasonality?: number[]; inflationGrowth?: number[] },
  ) =>
    request<import('@/types').Expense>(`/companies/${companyId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').Expense>) =>
    request<import('@/types').Expense>(`/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/expenses/${id}`, { method: 'DELETE' }),
}


export const investmentApi = {
  create: (
    companyId: number,
    data: {
      name: string
      amount?: number
      usefulLife?: number
      equipmentType?: 'electrique' | 'non_electrique' | null
      financedEquity?: number
      contributionType?: 'nature' | 'financier'
      financedLoan?: number
      financedGrant?: number
      loanRate?: number
      loanYears?: number
    },
  ) =>
    request<import('@/types').Investment>(`/companies/${companyId}/investments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').Investment>) =>
    request<import('@/types').Investment>(`/investments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/investments/${id}`, { method: 'DELETE' }),
}


export const investmentTerrainApi = {
  create: (
    companyId: number,
    data: {
      name: string
      amount?: number
      natureType?: 'immateriel' | 'physique'
    },
  ) =>
    request<import('@/types').InvestmentTerrain>(`/companies/${companyId}/investment-terrains`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<import('@/types').InvestmentTerrain>) =>
    request<import('@/types').InvestmentTerrain>(`/investment-terrains/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<void>(`/investment-terrains/${id}`, { method: 'DELETE' }),
}


export const additionalFundingApi = {
  update: (companyId: number, data: import('@/types').AdditionalFunding[]) =>
    request<import('@/types').AdditionalFunding[]>(
      `/companies/${companyId}/additional-fundings`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    ),
}


export const activityLogApi = {
  list: (companyId: number, limit = 50) =>
    request<import('@/types').ActivityLog[]>(
      `/companies/${companyId}/activity-logs?limit=${limit}`,
    ),
}


export interface UserSummary {
  id: number
  email: string
  firstName: string
  lastName: string
  fullName: string
  initials: string
  role: import('@/utils/permissions').UserRole
  isActive: boolean
  createdAt: string
}

export const userApi = {
  list: () =>
    request<UserSummary[]>('/users'),

  create: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: import('@/utils/permissions').UserRole = 'standard',
  ) =>
    request<UserSummary>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, firstName, lastName, role }),
    }),

  update: (id: number, data: { role?: import('@/utils/permissions').UserRole; isActive?: boolean }) =>
    request<UserSummary>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    request<{ deleted?: boolean; deactivated?: boolean; message?: string } | void>(`/users/${id}`, { method: 'DELETE' }),

}
