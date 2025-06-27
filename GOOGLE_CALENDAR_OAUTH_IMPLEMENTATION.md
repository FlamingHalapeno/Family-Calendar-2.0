# Google Calendar OAuth 2.0 Implementation Guide

## Overview
This document outlines the complete implementation of Google Calendar OAuth 2.0 integration for the Family Calendar app, following security best practices with server-side token exchange.

## Architecture

### 1. Client-Side Authentication Flow (`hooks/useGoogleAuth.ts`)
- Uses `expo-auth-session` with PKCE flow for secure OAuth
- Triggers Google OAuth consent screen
- Receives authorization code (NOT access tokens directly)
- Sends authorization code to Supabase Edge Function for token exchange

### 2. Server-Side Token Exchange (`supabase/functions/link-google-account/index.ts`)
- Securely exchanges authorization code for access/refresh tokens
- Fetches user's Google Calendar list
- Stores encrypted tokens in database
- Only stores calendars with write access (owner/writer roles)

### 3. Database Schema (`supabase-complete-setup.sql`)
- `linked_calendars` table stores calendar connections
- Access tokens should be encrypted in production
- RLS policies ensure users only access their own data

## Implementation Details

### Phase 1: Google Cloud Console Setup (External)
1. Create Google Cloud Project
2. Enable Google Calendar API
3. Configure OAuth consent screen with required scopes:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
   - `openid`, `email`, `profile`
4. Create OAuth 2.0 Client IDs for iOS/Android
5. Update `app.json` with your actual Client IDs

### Phase 2: Environment Variables
Set these in your Supabase project secrets:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Phase 3: Code Structure

#### Client-Side Hook (`useGoogleAuth`)
```typescript
const { linkGoogleCalendar, isLoading, error, clearError, canMakeRequest } = useGoogleAuth();
```

Key features:
- Handles OAuth flow initiation
- Manages loading/error states
- Sends authorization code to Edge Function
- Returns success status and calendar count

#### Edge Function (`link-google-account`)
Handles:
- Authorization code validation
- Token exchange with Google
- User authentication verification
- Calendar list fetching
- Database storage with encryption (TODO)
- Error handling and logging

#### UI Integration (`FamilyMemberDetailScreen`)
Features:
- "Link Google Calendar" button (only visible to user viewing their own profile)
- Loading states during OAuth flow
- Success/error feedback
- Visual indication of linked status

## Security Considerations

### ✅ Implemented Security Features
1. **Server-side token exchange**: Prevents token exposure to client
2. **User authentication**: Verifies user before storing tokens
3. **Limited calendar access**: Only stores calendars with write permissions
4. **RLS policies**: Database-level access control
5. **Error handling**: Secure error messages without token leakage

### 🔒 Production Security TODO
1. **Token encryption**: Use Supabase Vault to encrypt stored tokens
2. **Token refresh**: Implement automatic token refresh logic
3. **Audit logging**: Track calendar access and modifications
4. **Rate limiting**: Prevent abuse of OAuth endpoints

## Database Schema

### linked_calendars Table
```sql
CREATE TABLE public.linked_calendars (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL, -- 'google', 'outlook', etc.
    account_email TEXT NOT NULL,
    calendar_id TEXT NOT NULL,
    calendar_name TEXT,
    access_token TEXT NOT NULL, -- Should be encrypted
    refresh_token TEXT, -- Should be encrypted  
    expires_at TIMESTAMP WITH TIME ZONE,
    color TEXT DEFAULT '#007AFF' NOT NULL,
    is_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, provider, calendar_id)
);
```

## Testing Checklist

### Prerequisites
- [ ] Google Cloud project configured
- [ ] OAuth consent screen approved
- [ ] Client IDs added to `app.json`
- [ ] Supabase secrets configured
- [ ] Database schema deployed

### Functional Testing
- [ ] OAuth flow initiates correctly
- [ ] User can complete Google authentication
- [ ] Authorization code is sent to Edge Function
- [ ] Tokens are exchanged successfully
- [ ] User's calendars are fetched and filtered
- [ ] Calendar data is stored in database
- [ ] UI shows success message with calendar count
- [ ] Linked status is displayed correctly

### Error Testing
- [ ] Network failures are handled gracefully
- [ ] Invalid authorization codes are rejected
- [ ] Unauthenticated requests are blocked
- [ ] Database errors don't expose sensitive data
- [ ] UI shows appropriate error messages

## Usage Example

```typescript
// In a React component
const { linkGoogleCalendar, isLoading, error } = useGoogleAuth();

const handleLink = async () => {
  const result = await linkGoogleCalendar();
  if (result.success) {
    console.log(`Linked ${result.calendars?.length} calendars`);
  }
};
```

## Next Steps

1. **Calendar Sync**: Implement bidirectional event synchronization
2. **Token Refresh**: Add automatic token refresh before expiry
3. **Multiple Providers**: Extend to support Outlook, Apple Calendar
4. **Conflict Resolution**: Handle conflicts between local and external events
5. **Real-time Updates**: Use webhooks for live calendar updates

## Files Modified/Created

### Modified
- `hooks/useGoogleAuth.ts` - OAuth client logic
- `screens/FamilyMemberDetailScreen.tsx` - UI integration
- `supabase-complete-setup.sql` - Database schema and policies
- `app.json` - Google Client ID configuration

### Created
- `supabase/functions/link-google-account/index.ts` - Token exchange function
- `supabase/functions/link-google-account/deno.json` - Deno configuration

## Support

For issues with this implementation:
1. Check Supabase Edge Function logs
2. Verify Google Cloud Console configuration
3. Ensure all environment variables are set
4. Test with a simple OAuth flow first 