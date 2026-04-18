/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as appSubmittedAdmin } from './app-submitted-admin.tsx'
import { template as appSubmittedUser } from './app-submitted-user.tsx'
import { template as appApprovedUser } from './app-approved-user.tsx'
import { template as appRejectedUser } from './app-rejected-user.tsx'
import { template as appNewComment } from './app-new-comment.tsx'
import { template as appLikesDigest } from './app-likes-daily-digest.tsx'
import { template as appFavoritesDigest } from './app-favorites-daily-digest.tsx'
import { template as welcomeUser } from './welcome-user.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'app-submitted-admin': appSubmittedAdmin,
  'app-submitted-user': appSubmittedUser,
  'app-approved-user': appApprovedUser,
  'app-rejected-user': appRejectedUser,
  'app-new-comment': appNewComment,
  'app-likes-daily-digest': appLikesDigest,
  'app-favorites-daily-digest': appFavoritesDigest,
  'welcome-user': welcomeUser,
}
