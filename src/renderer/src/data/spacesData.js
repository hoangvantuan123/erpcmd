/**
 * ClickUp-Style Permissions & Privacy Data Model
 * 
 * Standard Permission Roles:
 * - FULL_EDIT: Can create tasks, edit list/space settings, delete list/space, manage sharing.
 * - EDIT: Can edit tasks and list settings. Cannot create tasks or delete list.
 * - COMMENT: Can comment. Assignees can set task status. Cannot edit list settings.
 * - VIEW_ONLY: Read-only access. Cannot edit entities or comment outside chat.
 * 
 * Privacy Levels:
 * - WORKSPACE: Public to everyone in the workspace.
 * - PRIVATE: Visible only to invited users and teams.
 * - SHARED: Accessible via private link or explicit guest sharing.
 */

export const PERMISSION_ROLES = {
  FULL_EDIT: {
    id: 'full_edit',
    name: 'Full edit',
    description: 'Can create tasks in this List, edit List settings, and delete the List.',
    capabilities: {
      canCreateTask: true,
      canEditSettings: true,
      canDelete: true,
      canComment: true,
      canShare: true,
      canAssign: true
    }
  },
  EDIT: {
    id: 'edit',
    name: 'Edit',
    description: 'Can edit tasks and List settings. Cannot create tasks or delete the List.',
    capabilities: {
      canCreateTask: false,
      canEditSettings: true,
      canDelete: false,
      canComment: true,
      canShare: false,
      canAssign: true
    }
  },
  COMMENT: {
    id: 'comment',
    name: 'Comment',
    description: 'Can comment. Assignees can set task status. Cannot edit List settings.',
    capabilities: {
      canCreateTask: false,
      canEditSettings: false,
      canDelete: false,
      canComment: true,
      canShare: false,
      canAssign: false
    }
  },
  VIEW_ONLY: {
    id: 'view_only',
    name: 'View only',
    description: 'Read-only. Cannot edit entities or comment in this List outside of Chat.',
    capabilities: {
      canCreateTask: false,
      canEditSettings: false,
      canDelete: false,
      canComment: false,
      canShare: false,
      canAssign: false
    }
  }
}

export const PRIVACY_LEVELS = {
  WORKSPACE: {
    id: 'workspace',
    name: 'Workspace Public',
    description: 'Shared with all workspace members'
  },
  PRIVATE: {
    id: 'private',
    name: 'Private',
    description: 'Only accessible to invited members & teams'
  },
  SHARED: {
    id: 'shared',
    name: 'Shared via Link',
    description: 'Accessible via private shareable link'
  }
}

/**
 * Default Spaces Data with Permissions
 */
export const initialSpaces = [
  {
    id: 'quyet-toan-lenh',
    name: 'Quyết toán lệnh',
    iconColor: 'bg-emerald-600',
    privacy: 'workspace',
    accessControl: {
      isPrivate: false,
      defaultPermission: 'full_edit',
      teams: [],
      members: [
        { id: 'me', name: 'Admin', avatar: 'A', role: 'Quản trị viên', permission: 'full_edit', isOwner: true }
      ]
    },
    subItems: [
      { 
        id: 'settle-process', 
        name: 'Quyết toán lệnh công đoạn', 
        type: 'list'
      },
      { 
        id: 'settle-step', 
        name: 'Quyết toán lệnh thao tác', 
        type: 'list'
      },
      { 
        id: 'settle-logs', 
        name: 'Nhật ký quyết toán', 
        type: 'doc'
      }
    ]
  }
]


/**
 * Helper to get permission role definition
 */
export const getRoleDefinition = (roleId) => {
  const roleKey = Object.keys(PERMISSION_ROLES).find(key => PERMISSION_ROLES[key].id === roleId)
  return roleKey ? PERMISSION_ROLES[roleKey] : PERMISSION_ROLES.VIEW_ONLY
}
