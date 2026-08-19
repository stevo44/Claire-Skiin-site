import api from './api';

export interface ShippingTown {
  id: number;
  region_name: string;
  rate: number;
  delivery_method: 'local_delivery' | 'agency_shipping';
}

export interface Agency {
  id: number;
  name: string;
  origin_location: string | null;
  contact_phone: string | null;
  is_verified: boolean;
  destination_office_location: string | null;
  coverage_verified: boolean;
}

export interface AdminAgency {
  id: number;
  name: string;
  origin_location: string | null;
  contact_phone: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AgencyCoverage {
  id: number;
  agency_id: number;
  town_name: string;
  destination_office_location: string | null;
  is_verified: boolean;
}

export const DEFAULT_TOWNS: ShippingTown[] = [
  { id: 1, region_name: 'Buea',      rate: 1500, delivery_method: 'local_delivery'  },
  { id: 2, region_name: 'Douala',    rate: 2500, delivery_method: 'agency_shipping' },
  { id: 3, region_name: 'Yaoundé',   rate: 3000, delivery_method: 'agency_shipping' },
  { id: 4, region_name: 'Bamenda',   rate: 3500, delivery_method: 'agency_shipping' },
  { id: 5, region_name: 'Limbe',     rate: 2000, delivery_method: 'agency_shipping' },
  { id: 6, region_name: 'Kribi',     rate: 3500, delivery_method: 'agency_shipping' },
  { id: 7, region_name: 'Bafoussam', rate: 3500, delivery_method: 'agency_shipping' },
  { id: 8, region_name: 'Dschang',   rate: 3500, delivery_method: 'agency_shipping' },
  { id: 9, region_name: 'Garoua',    rate: 5000, delivery_method: 'agency_shipping' },
  { id: 10, region_name: 'Maroua',   rate: 5500, delivery_method: 'agency_shipping' },
];

export const DEFAULT_AGENCIES: Record<string, Agency[]> = {
  Douala: [
    { id: 101, name: 'Vatican Express',          origin_location: 'Mile 17 Junction, Buea', contact_phone: '+237 670 11 22 33', is_verified: true, destination_office_location: 'Akwa & Bonaberi Offices, Douala', coverage_verified: true },
    { id: 102, name: 'General Express Voyage',    origin_location: 'Mile 17 Motor Park, Buea', contact_phone: '+237 699 44 55 66', is_verified: true, destination_office_location: 'Bessengue Terminal, Douala', coverage_verified: true },
  ],
  Yaoundé: [
    { id: 103, name: 'Guarantee Express',        origin_location: 'Mile 17 Junction, Buea', contact_phone: '+237 677 88 99 00', is_verified: true, destination_office_location: 'Mvan Park Office, Yaoundé', coverage_verified: true },
    { id: 104, name: 'Touristique Express',       origin_location: 'Mile 17 Motor Park, Buea', contact_phone: '+237 690 12 34 56', is_verified: true, destination_office_location: 'Mvan Agency Terminal, Yaoundé', coverage_verified: true },
  ],
  Bamenda: [
    { id: 105, name: 'Amour Mezam Express',      origin_location: 'Mile 17 Motor Park, Buea', contact_phone: '+237 675 33 22 11', is_verified: true, destination_office_location: 'Commercial Avenue, Bamenda', coverage_verified: true },
    { id: 106, name: 'Moghamo Express',           origin_location: 'Mile 17 Junction, Buea', contact_phone: '+237 674 11 22 33', is_verified: true, destination_office_location: 'Up-Station Junction, Bamenda', coverage_verified: true },
  ],
  Limbe: [
    { id: 107, name: 'Oceanic Transport',        origin_location: 'Mile 17 Motor Park, Buea', contact_phone: '+237 673 44 55 66', is_verified: true, destination_office_location: 'Half Mile Park, Limbe', coverage_verified: true },
  ],
  Kribi: [
    { id: 108, name: 'Kribi Beach Line',         origin_location: 'Mile 17 Motor Park, Buea', contact_phone: '+237 672 88 77 66', is_verified: true, destination_office_location: 'Domayo Park, Kribi', coverage_verified: true },
  ],
};

export const shippingService = {
  /**
   * Get available shipping towns and rates from database, with fallback to standard Cameroonian towns
   */
  getAvailableTowns: async (): Promise<ShippingTown[]> => {
    try {
      const res = await api.get('/shipping/towns');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return DEFAULT_TOWNS;
    } catch {
      return DEFAULT_TOWNS;
    }
  },

  /**
   * Get agencies operating from Buea to a given destination town
   */
  getAgenciesForTown: async (town: string): Promise<Agency[]> => {
    try {
      const res = await api.get('/shipping/agencies', { params: { town } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      const norm = town.trim();
      const matchedKey = Object.keys(DEFAULT_AGENCIES).find(k => k.toLowerCase() === norm.toLowerCase());
      return matchedKey ? DEFAULT_AGENCIES[matchedKey] : (DEFAULT_AGENCIES['Douala'] || []);
    } catch {
      const norm = town.trim();
      const matchedKey = Object.keys(DEFAULT_AGENCIES).find(k => k.toLowerCase() === norm.toLowerCase());
      return matchedKey ? DEFAULT_AGENCIES[matchedKey] : (DEFAULT_AGENCIES['Douala'] || []);
    }
  },

  // ── Admin Endpoints ──

  getAdminAgencies: async (): Promise<AdminAgency[]> => {
    try {
      const res = await api.get('/admin/agencies');
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  createAgency: async (data: Partial<AdminAgency>): Promise<AdminAgency> => {
    const res = await api.post('/admin/agencies', data);
    return res.data?.data || res.data;
  },

  updateAgency: async (id: number, data: Partial<AdminAgency>): Promise<AdminAgency> => {
    const res = await api.put(`/admin/agencies/${id}`, data);
    return res.data?.data || res.data;
  },

  deleteAgency: async (id: number): Promise<void> => {
    await api.delete(`/admin/agencies/${id}`);
  },

  getAgencyCoverage: async (agencyId: number): Promise<AgencyCoverage[]> => {
    try {
      const res = await api.get(`/admin/agencies/${agencyId}/coverage`);
      const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  addAgencyCoverage: async (agencyId: number, data: Partial<AgencyCoverage>): Promise<AgencyCoverage> => {
    const res = await api.post(`/admin/agencies/${agencyId}/coverage`, data);
    return res.data?.data || res.data;
  },

  updateAgencyCoverage: async (coverageId: number, data: Partial<AgencyCoverage>): Promise<AgencyCoverage> => {
    const res = await api.put(`/admin/agencies/coverage/${coverageId}`, data);
    return res.data?.data || res.data;
  },

  deleteAgencyCoverage: async (coverageId: number): Promise<void> => {
    await api.delete(`/admin/agencies/coverage/${coverageId}`);
  },
};
