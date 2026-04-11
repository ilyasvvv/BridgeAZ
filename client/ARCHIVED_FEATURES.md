# BizimCircle — Archived Features (Pre-MVP)

These features were removed from the active codebase to simplify the MVP.
Files still exist in `/src/pages/` and `/src/components/` but are not routed.
Re-enable by adding routes back in `App.jsx`.

---

## Removed Pages

| Page | File | Description |
|------|------|-------------|
| For You Feed | `ForYou.jsx` | Algorithm-driven feed with filtering (Latest, Trending, Discussed, Progress) |
| Opportunities | `Opportunities.jsx` | Job/project board with create/edit/apply |
| Opportunity Detail | `OpportunityDetail.jsx` | Single opportunity view |
| Network | `Network.jsx` | People discovery with filters |
| Chats | `Chats.jsx` | Full messaging system |
| Notifications | `Notifications.jsx` | Notification center |
| Search | `Search.jsx` | Dedicated search results page |
| Admin | `Admin.jsx` | Admin panel |
| Contact | `Contact.jsx` | Contact form |
| Explore | `Explore.jsx` | Member browser |
| Public Profile | `PublicProfile.jsx` | Read-only profile view |
| Post Detail | `PostDetail.jsx` | Individual post view |
| Register | `Register.jsx` | Separate registration (Join.jsx covers this) |
| Access Denied | `AccessDenied.jsx` | 403 page |
| Qovshaq | `qovshaq/*` | Entire Qovshaq subsystem |

## Removed Components

| Component | File | Description |
|-----------|------|-------------|
| Old Navbar | `Navbar.jsx` | Tab-based navigation (Home, For You, Opportunities, Network, Chats) |
| Search Overlay | `SearchOverlay.jsx` | Cmd+K search modal |
| Opportunity Card | `OpportunityCard.jsx` | Opportunity listing card |
| Community Post Card | `CommunityPostCard.jsx` | Alternative post format |
| Globe | `Globe.jsx` | Three.js interactive globe |
| Share Sheet | `ShareSheet.jsx` | Social sharing modal |
| Google Auth Button | `GoogleAuthButton.jsx` | OAuth button |
| Country Combobox | `CountryCombobox.jsx` | Country selector |
| Country MultiSelect | `CountryMultiSelect.jsx` | Multi-country picker |

## Archived Feature Concepts

### Professional Features (Deferred)
- Mentorship matching system
- Student/Professional verification badges
- Mentor mode toggle
- Resume upload
- Experience/Education editing
- Verification documents

### Social Features (Deferred)
- Full messaging (DMs, group chats)
- Comment threads on posts
- Post sharing/resharing
- Save/bookmark posts
- Notification system (likes, follows, mentions)

### Discovery Features (Deferred)
- Algorithm-driven "For You" feed
- Trending/Discussed/Progress feed views
- Advanced search with filters
- Member discovery by region/skills

### Community Features (Deferred)
- Circles/groups with admin controls
- Circle-specific feeds
- Circle privacy settings (public/private/invite)
- Circle profiles

### Admin Features (Deferred)
- User management panel
- Content moderation
- Role-based access (staffC, staffB, adminA)
- Analytics dashboard

---

## Product Vision Notes (for future iterations)

1. **Simplify MVP** — bet on one core value prop first, iterate from user feedback
2. **Feed-first home** — no dashboard, just a sincere, welcoming feed
3. **Location filtering** — posts visible to specific locations vs global
4. **Custom tags** — user-created hashtags for searchability
5. **Recommendation system** — on signup, show people in your area with similar background
6. **Report violations** — trust & safety from day one
7. **AI engagement** — AI occasionally posts topics to seed discussion
8. **Community groups** — Substack-style interest/location groups (post-MVP)
9. **All ages & backgrounds** — diverge from strictly professional, embrace diversity

## How to Re-enable

Add routes back in `App.jsx`:
```jsx
import ForYou from "./pages/ForYou";
// ...
<Route path="/fyp" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
```
