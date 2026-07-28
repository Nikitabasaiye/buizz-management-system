import axios from 'axios';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const GALLERY_API_BASE = `${API_BASE}/event-gallery`;
const EVENTS_API_BASE = `${API_BASE}/events`;

function getStoredToken() {
  if (typeof window === 'undefined') return '';

  const keys = [
    'buizz-organizer-session',
    'buizz-organizer',
    'buizz-super-admin-session',
    'buizz-admin-session',
  ];

  for (const key of keys) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '{}');
      const token = parsed?.token ?? parsed?.state?.session?.token ?? parsed?.state?.token;
      if (token) return String(token);
    } catch {
      // Keep checking the next session key.
    }
  }

  return window.localStorage.getItem('token') || '';
}

interface GalleryImage {
  id: number;
  event_id: number;
  image_url: string;
  caption: string | null;
  is_featured: boolean;
  sort_order: number;
  uploaded_by: number;
  uploader_name: string;
  created_at: string;
}

interface AddImageData {
  event_id: number;
  image_url: string;
  caption?: string;
  is_featured?: boolean;
  sort_order?: number;
}

export const eventGalleryApi = {
  // Add image to event gallery
  async addImage(data: AddImageData): Promise<GalleryImage> {
    const token = getStoredToken();
    const response = await axios.post(`${GALLERY_API_BASE}/event/${data.event_id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Upload an image file to backend media storage and return its public URL
  async uploadEventImage(file: File): Promise<string> {
    const token = getStoredToken();
    const formData = new FormData();
    formData.append('image', file);

    const response = await axios.post(`${EVENTS_API_BASE}/upload-image`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const url = response.data?.data?.url;
    if (!url) throw new Error('Image upload did not return a URL');
    return url;
  },

  // Get all images for an event
  async getEventImages(eventId: number): Promise<GalleryImage[]> {
    const response = await axios.get(`${GALLERY_API_BASE}/event/${eventId}`);
    return response.data.data;
  },

  // Update gallery image
  async updateImage(
    imageId: number,
    data: { caption?: string; is_featured?: boolean; sort_order?: number; image_url?: string }
  ): Promise<GalleryImage> {
    const token = getStoredToken();
    const response = await axios.put(`${GALLERY_API_BASE}/image/${imageId}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Delete gallery image
  async deleteImage(imageId: number): Promise<void> {
    const token = getStoredToken();
    await axios.delete(`${GALLERY_API_BASE}/image/${imageId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Reorder images in gallery
  async reorderImages(eventId: number, imageOrders: { id: number; sort_order: number }[]): Promise<void> {
    const token = getStoredToken();
    await axios.put(`${GALLERY_API_BASE}/event/${eventId}/reorder`, { imageOrders }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  // Set featured image for event
  async setFeaturedImage(eventId: number, imageId: number): Promise<GalleryImage> {
    const token = getStoredToken();
    const response = await axios.put(`${GALLERY_API_BASE}/event/${eventId}/featured/${imageId}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },

  // Get featured image for event
  async getFeaturedImage(eventId: number): Promise<GalleryImage | null> {
    const response = await axios.get(`${GALLERY_API_BASE}/event/${eventId}/featured`);
    return response.data.data;
  }
};
