import React, { useState, useEffect } from 'react';
import { UserPlus, X, Shield, Trash2, Edit, Loader2 } from 'lucide-react';
import { checkinStaffApi } from '../../services/checkinStaffApi';

interface StaffAssignment {
  id: number;
  event_id: number;
  staff_id: number;
  staff_name: string;
  staff_email: string;
  staff_role: string;
  staff_avatar?: string;
  permissions: {
    scan?: boolean;
    view?: boolean;
    manage?: boolean;
  };
  is_active: boolean;
  assigned_at: string;
}

interface CheckinStaffManagementProps {
  eventId: number;
  onClose?: () => void;
}

const CheckinStaffManagement: React.FC<CheckinStaffManagementProps> = ({ eventId, onClose }) => {
  const [staff, setStaff] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStaff();
  }, [eventId]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const data = await checkinStaffApi.getEventStaff(eventId);
      setStaff(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (assignmentId: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;

    try {
      await checkinStaffApi.removeStaff(assignmentId);
      setStaff(prev => prev.filter(s => s.id !== assignmentId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove staff');
    }
  };

  const handleTogglePermission = async (assignmentId: number, permission: string) => {
    try {
      const assignment = staff.find(s => s.id === assignmentId);
      if (!assignment) return;

      const updatedPermissions = {
        ...assignment.permissions,
        [permission]: !assignment.permissions[permission as keyof typeof assignment.permissions]
      };

      await checkinStaffApi.updateAssignment(assignmentId, { permissions: updatedPermissions });
      await loadStaff();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-in Staff</h2>
          <p className="text-gray-600">Manage staff assigned to this event</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No staff assigned yet</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Assign first staff member
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {staff.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">
                    {assignment.staff_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{assignment.staff_name}</h4>
                  <p className="text-sm text-gray-600">{assignment.staff_email}</p>
                  <p className="text-xs text-gray-400 capitalize">{assignment.staff_role}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Permissions */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignment.permissions.scan || false}
                      onChange={() => handleTogglePermission(assignment.id, 'scan')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">Scan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignment.permissions.view || false}
                      onChange={() => handleTogglePermission(assignment.id, 'view')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">View</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignment.permissions.manage || false}
                      onChange={() => handleTogglePermission(assignment.id, 'manage')}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">Manage</span>
                  </label>
                </div>

                {/* Actions */}
                <button
                  onClick={() => handleRemoveStaff(assignment.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove staff"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Add Staff Member</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff User ID
                </label>
                <input
                  type="number"
                  placeholder="Enter user ID"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Permissions</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-600">Scan tickets</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-600">View tickets</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-sm text-gray-600">Manage staff</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Implement add staff logic
                  setShowAddModal(false);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinStaffManagement;
