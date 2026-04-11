# BizimCircle Platform - Functionalities List

## Core Features to Implement

### 1. Authentication & User Management
- [x] Sign Up / Register
- [x] Login / Sign Out
- [ ] Social login (Google OAuth)
- [ ] Email verification
- [ ] Password reset
- [x] User profile management
- [ ] Profile avatar upload
- [ ] Bio, headline, skills editing

### 2. Posting System (Qovshaq-style)
- [ ] Post creation with multiple content types:
  - [ ] Note (text-based)
  - [ ] Event (with date, time, location, RSVP)
  - [ ] Opportunity (job/project listing)
- [ ] Rich text editor / markdown support
- [ ] Image/media uploads
- [ ] Post scheduling
- [ ] Draft saving
- [ ] Post editing & deletion
- [ ] Post visibility controls (public/private/circles-only)

### 3. Feed & Discovery
- [x] Feed timeline display
- [ ] Post engagement:
  - [x] Like/unlike posts
  - [ ] Comments on posts
  - [ ] Share posts
  - [ ] Save/bookmark posts
- [ ] Feed filtering (by type, circle, person)
- [ ] Infinite scroll / pagination
- [ ] Real-time updates

### 4. Circles (Communities)
- [ ] Create circle
- [ ] Join/leave circle
- [ ] Circle discovery/recommendations
- [ ] Circle feed (circle-specific posts)
- [ ] Circle members list
- [ ] Circle admin controls
- [ ] Circle privacy (public/private/invite-only)
- [ ] Circle settings

### 5. People & Connections
- [ ] Search people
- [ ] Follow/unfollow users
- [ ] Block users
- [ ] User recommendations
- [ ] Connection status (follower, following, mutual)
- [ ] User list filtering by location, skills, interests

### 6. Messaging & Notifications
- [x] Direct messages
- [ ] Message threads/conversations
- [ ] Message notifications
- [ ] Typing indicators
- [ ] Message read receipts
- [ ] Group chats (future)
- [ ] Notifications center
- [ ] Notification types: likes, comments, follows, messages, circle invites
- [ ] Notification settings/preferences

### 7. Location & Community Discovery
- [x] Location selector (header dropdown - "London")
- [ ] Location-based feed filtering
- [ ] Local community highlights
- [ ] Regional circle browsing
- [ ] Nearby members discovery

### 8. Search
- [x] Global search bar
- [ ] Search people
- [ ] Search circles
- [ ] Search posts (by keywords, hashtags)
- [ ] Search filters (type, date, location, circle)
- [ ] Search history
- [ ] Trending searches

### 9. Profile & User Pages
- [x] Profile page with stats
- [x] Posts tab
- [x] Circles tab
- [x] Opportunities tab
- [ ] Public profile view (for other users)
- [ ] Profile verification badges
- [ ] User portfolio/projects
- [ ] User experience/education history

### 10. Settings & Preferences
- [ ] Account settings
- [ ] Privacy settings (profile visibility, who can message, etc.)
- [ ] Notification preferences
- [ ] Email preferences
- [ ] Theme/appearance settings
- [ ] Language settings
- [ ] Data export

### 11. Admin & Moderation
- [ ] Admin panel
- [ ] User management
- [ ] Content moderation
- [ ] Report/flag content
- [ ] Ban users
- [ ] Community guidelines enforcement

### 12. Analytics & Metrics
- [ ] User stats (followers, following, posts, circles)
- [ ] Post engagement metrics
- [ ] Circle analytics
- [ ] Trending content

---

## UI/UX Components

### Header (Consistent across all pages)
- [x] BizimCircle logo (circular icon)
- [x] Location dropdown selector ("London", etc.)
- [x] "circle" text label
- [x] Global search bar
- [x] Notifications icon with badge
- [x] Profile picture / avatar icon
- [x] Dropdown menu (settings, profile, logout)
- [ ] Animated hover states

### Sidebar (Left - Home page only)
- [x] Circles For You (recommendations)
- [x] People For You (recommendations)
- [ ] "View All" circles
- [ ] "View All" people

### Post Creation (Qovshaq-style)
- [ ] Tabs: Note | Event | Opportunity
- [ ] Rich text editor (for Note)
- [ ] Event form (date, time, location, capacity, RSVP)
- [ ] Opportunity form (title, company, description, salary range, location)
- [ ] Image/media upload
- [ ] Preview before posting
- [ ] Cancel/Draft options
- [ ] Post visibility selector

### Feed Display
- [x] Post cards with:
  - [x] User avatar + name + timestamp + location
  - [x] Post content (text, images, media)
  - [x] Engagement buttons (like, comment, share)
  - [x] Engagement counts
  - [ ] More options menu (edit, delete, report)

### Messages Sidebar (Right - Home page only)
- [x] Search messages
- [x] Message preview list
- [x] Active status indicator
- [x] New message button
- [ ] Message thread view

### Profile Page
- [x] Large circular avatar
- [x] User name, headline, stats
- [x] Bio, skills, links
- [x] Action buttons (Edit, Message, Follow)
- [x] Tabs (Posts, Circles, Opportunities)
- [x] Grid layouts for content
- [ ] Edit mode for profile owner

---

## Data Models / Backend

### User
- _id, name, email, password, avatar, headline, bio, location, skills, links
- followers[], following[], blocks[]
- stats: postCount, followerCount, followingCount, likeCount

### Post
- _id, authorId, content, type (Note|Event|Opportunity), createdAt, updatedAt
- images[], tags[], circleId (optional)
- engagement: likes[], comments[], shares[]
- visibility (public|private|circles-only)

### Circle
- _id, name, description, avatar, privacy (public|private|invite)
- members[], admins[], posts[]
- stats: memberCount

### Message
- _id, senderId, receiverId, content, timestamp, readAt
- attachments[]

### Event (Post sub-type)
- title, startDate, endDate, location, description, capacity, attendees[]

### Opportunity (Post sub-type)
- title, company, description, type (job|project), salary, location, deadline

---

## Pages to Build

- [x] Landing Page (fix layout)
- [x] Login/Register (connects to Home, not ForYou)
- [x] Home/Dashboard (main feed)
- [x] Profile Page (view & edit)
- [ ] Circle Detail Page
- [ ] Public Profile View (other users)
- [ ] Search Results Page
- [ ] Settings Page
- [ ] Notifications Page
- [ ] Messages Thread Page
- [ ] Admin Panel

---

## Next Implementation Priority

1. Fix Landing page layout (move graphic to left)
2. Redesign Header to exact Figma specs
3. Implement Qovshaq posting system (Note/Event/Opportunity tabs)
4. Fix auth redirect (login → Home, not ForYou)
5. Refine Dashboard layout to exact Figma design
6. Implement location dropdown functionality
7. Build Circle detail pages
8. Build full profile editing
9. Settings page
10. Notification system
