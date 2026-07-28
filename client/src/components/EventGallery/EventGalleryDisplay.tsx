import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Star, Edit, Trash2, Plus } from 'lucide-react';
import { eventGalleryApi } from '../../services/eventGalleryApi';
import EventGalleryUpload from './EventGalleryUpload';

interface GalleryImage {
  id: number;
  event_id: number;
  image_url: string;
  caption: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
}

interface EventGalleryDisplayProps {
  eventId: number;
  editable?: boolean;
  onImageClick?: (image: GalleryImage) => void;
}

const EventGalleryDisplay: React.FC<EventGalleryDisplayProps> = ({ 
  eventId, 
  editable = false,
  onImageClick 
}) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadImages();
  }, [eventId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await eventGalleryApi.getEventImages(eventId);
      setImages(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId: number) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await eventGalleryApi.deleteImage(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete image');
    }
  };

  const handleSetFeatured = async (imageId: number) => {
    try {
      await eventGalleryApi.setFeaturedImage(eventId, imageId);
      await loadImages();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set featured image');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Event Gallery ({images.length})
        </h3>
        {editable && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Images
          </button>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No images uploaded yet</p>
          {editable && (
            <button
              onClick={() => setShowUpload(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Upload first image
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
              onClick={() => onImageClick?.(image)}
            >
              <img
                src={image.image_url}
                alt={image.caption || 'Event image'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              
              {/* Featured Badge */}
              {image.is_featured && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Featured
                </div>
              )}

              {/* Editable Actions */}
              {editable && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_featured && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetFeatured(image.id);
                      }}
                      className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      title="Set as featured"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Caption */}
              {image.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs truncate">{image.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <EventGalleryUpload
          eventId={eventId}
          onUploadComplete={() => {
            loadImages();
            setShowUpload(false);
          }}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

export default EventGalleryDisplay;
