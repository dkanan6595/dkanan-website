// DKANAN Database Schema - Firestore
// Version 1.0 - Scalable Design

// ================= COLLECTIONS =================

/*
1. users
   - uid: string (auth ID)
   - email: string
   - displayName: string
   - photoURL: string
   - role: 'artist' | 'creator' | 'buyer' | 'visitor'
   - membership: 'free' | 'premium' | 'advanced'
   - createdAt: timestamp
   - updatedAt: timestamp
   
   Subcollection: portfolio
   - artworkId: string
   - imageUrl: string
   - title: string
   - description: string
   - category: string
   - createdAt: timestamp

2. profiles (extended user info)
   - userId: string (ref to users)
   - bio: string
   - skills: array
   - category: string (painting, sculpture, digital, etc.)
   - location: {
       district: string,
       state: string,
       country: string,
       coordinates: geopoint
     }
   - socialLinks: {
       instagram: string,
       youtube: string,
       twitter: string,
       website: string
     }
   - stats: {
       followers: number,
       following: number,
       artworks: number,
       sales: number
     }
   - isVerified: boolean
   - isMatchingEnabled: boolean
   - interests: array

3. artworks
   - id: string
   - sellerId: string (ref to users)
   - title: string
   - description: string
   - price: number
   - category: string
   - medium: string (oil, acrylic, digital, etc.)
   - dimensions: string
   - images: array
   - status: 'available' | 'sold' | 'reserved'
   - views: number
   - likes: number
   - commission: boolean
   - createdAt: timestamp

4. orders
   - id: string
   - buyerId: string
   - sellerId: string
   - artworkId: string
   - amount: number
   - status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
   - shippingAddress: object
   - paymentId: string
   - razorpayOrderId: string
   - createdAt: timestamp

5. commissions
   - id: string
   - requesterId: string
   - artistId: string
   - description: string
   - budget: number
   - deadline: timestamp
   - status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
   - referenceImages: array
   - createdAt: timestamp

6. chats (messages)
   - id: string
   - participants: array
   - lastMessage: string
   - lastMessageAt: timestamp
   - type: 'direct' | 'group' | 'channel'
   - name: string (for groups/channels)
   - avatar: string
   - createdBy: string
   - createdAt: timestamp

   Subcollection: messages
   - id: string
   - senderId: string
   - content: string
   - type: 'text' | 'image' | 'file'
   - readBy: array
   - createdAt: timestamp

7. community_posts
   - id: string
   - authorId: string
   - content: string
   - images: array
   - groupId: string (optional)
   - topic: string
   - likes: number
   - commentsCount: number
   - createdAt: timestamp

8. community_comments
   - id: string
   - postId: string
   - authorId: string
   - content: string
   - likes: number
   - createdAt: timestamp

9. community_groups
   - id: string
   - name: string
   - description: string
   - coverImage: string
   - members: array
   - postsCount: number
   - createdBy: string
   - createdAt: timestamp
   - isPrivate: boolean

10. notifications
    - id: string
    - userId: string
    - type: 'message' | 'order' | 'like' | 'follow' | 'comment' | 'system'
    - title: string
    - body: string
    - data: object
    - read: boolean
    - createdAt: timestamp

11. library_resources
    - id: string
    - title: string
    - description: string
    - type: 'tutorial' | 'article' | 'video' | 'resource'
    - category: string
    - thumbnail: string
    - content: string (or URL)
    - authorId: string
    - views: number
    - createdAt: timestamp

12. games
    - id: string
    - name: string
    - description: string
    - thumbnail: string
    - highScores: array
    - createdAt: timestamp

13. user_follows
    - id: string
    - followerId: string
    - followingId: string
    - createdAt: timestamp

14. user_likes
    - id: string
    - userId: string
    - targetType: 'artwork' | 'post' | 'comment'
    - targetId: string
    - createdAt: timestamp

15. reports
    - id: string
    - reporterId: string
    - reportedUserId: string
    - reason: string
    - description: string
    - status: 'pending' | 'reviewed' | 'resolved'
    - createdAt: timestamp
*/

// ================= INDEXES FOR QUERY PERFORMANCE =================

/*
- users: role, createdAt
- profiles: category, location.country, location.state, isMatchingEnabled
- artworks: sellerId, status, category, price
- orders: buyerId, sellerId, status
- commissions: artistId, status
- chats: participants (array-contains)
- community_posts: authorId, groupId, topic, createdAt
- notifications: userId, read, createdAt
*/

// ================= SECURITY RULES (firestore.rules) =================

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read their own data, admins can read all
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Profiles are public readable, editable by owner
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Artworks - public read, owner write
    match /artworks/{artworkId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.sellerId;
    }
    
    // Orders - only visible to buyer/seller
    match /orders/{orderId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.buyerId || request.auth.uid == resource.data.sellerId);
    }
    
    // Chats - only participants can read/write
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.participants;
    }
    
    // Community posts - public read, auth write
    match /community_posts/{postId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
    
    // Notifications - only owner can read
    match /notifications/{notifId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
*/