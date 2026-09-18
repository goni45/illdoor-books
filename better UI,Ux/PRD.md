# Polytechnic Used Book Platform

## Complete Project Plan

### 1. Project Name

Polytechnic Used Book Marketplace

বাংলায়:

পলিটেকনিক ইউজড বুক কেনাবেচা প্ল্যাটফর্ম

### 2. Project Goal

এই platform-এর মূল লক্ষ্য হলো পলিটেকনিক শিক্ষার্থীদের মধ্যে ব্যবহৃত বই কেনাবেচার একটি trusted, campus-based marketplace তৈরি করা।

একজন student তার পুরোনো semester-এর বই বিক্রি করতে পারবে।

অন্য student কম দামে সেই বই কিনতে পারবে।

Buyer এবং seller একই institute-এর হওয়ায় physical delivery-এর পরিবর্তে campus pickup/drop-off system ব্যবহার হবে।

ফলে:

- Courier দরকার হবে না
- Delivery cost থাকবে না
- বই দ্রুত পাওয়া যাবে
- একই campus-এর students-এর মধ্যে transaction হবে
- Platform transaction এবং verification পরিচালনা করবে

---

# 3. Core Concept

Platform-টি সাধারণ ecommerce website-এর মতো হবে না।

এটি হবে:

"Student-to-Student Campus Marketplace"

একজন user একই account দিয়ে দুই ধরনের কাজ করবে:

BUY BOOK

SELL BOOK

অর্থাৎ আলাদা buyer account বা seller account থাকবে না।

একই user:

- বই কিনতে পারবে
- বই বিক্রি করতে পারবে
- নিজের listing manage করতে পারবে
- নিজের purchases দেখতে পারবে
- নিজের sales দেখতে পারবে
- review পাবে
- review দিতে পারবে

---

# 4. Target Users

প্রাথমিক target user:

পলিটেকনিক institute-এর students

প্রথম version একটি নির্দিষ্ট institute দিয়ে শুরু করা ভালো।

উদাহরণ:

Mymensingh Polytechnic Institute

পরে অন্য institute যোগ করা যাবে।

---

# 5. Institute-Based Marketplace

Registration-এর সময় student নিজের institute নির্বাচন করবে।

তারপর profile-এর সঙ্গে institute permanently associate হবে।

Registration information:

- Full Name
- Student ID / Roll
- Institute
- Department
- Semester
- Phone Number
- Email
- Password
- Profile Photo

পরবর্তীতে institute verification যোগ করা যাবে।

উদাহরণ:

Mymensingh Polytechnic Institute

Department:

- Electronics
- Computer
- Electrical
- Civil
- Mechanical

---

# 6. User Account System

সবাই একই ধরনের account ব্যবহার করবে।

Login করার পরে user নিজের marketplace দেখতে পাবে।

Profile dashboard:

```
My Profile
My Listings
My Purchases
My Sales
My Wishlist
Book Requests
Reviews
Notifications
Account Settings
```

একজন user-এর role backend-এ আলাদা seller account হিসেবে তৈরি করার দরকার নেই।

একজন user বই list করলেই সেই book-এর seller হবে।

---

# 7. Homepage

Homepage-এর primary purpose হবে বই খুঁজে পাওয়া।

Top Navigation:

```
Logo
Search
Browse Books
My Orders
Notifications
Sell Now
Profile
```

Homepage sections:

```
Search Books

Browse by Department

Browse by Semester

Popular Books

Recently Listed

Books Near You

Book Requests

Sell Your Old Books
```

---

# 8. Search System

Search system project-এর গুরুত্বপূর্ণ অংশ হবে।

Student বই খুঁজতে পারবে:

- Book Name
- Author
- Subject Code
- Subject Name

সবচেয়ে গুরুত্বপূর্ণ filter হবে Subject Code।

উদাহরণ:

```
Search: 26811
```

Result:

```
Electrical Technology
Subject Code: 26811
4th Semester
৳450
Good Condition
```

---

# 9. Book Filtering

Book marketplace-এ filtering থাকবে।

Filters:

```
Department
Semester
Subject
Price Range
Condition
Availability
```

Optional future filters:

```
Edition
Author
Seller Rating
Recently Added
```

---

# 10. Book Listing System

Student "Sell Now" button চাপবে।

তারপর একটি simple listing form আসবে।

### Required information

```
Book Photos
Book Name
Subject Code
Department
Semester
Condition
Original Price
Selling Price
```

### Optional information

```
Author
Edition
Description
Writing inside book?
Highlighting?
Missing pages?
Cover damaged?
```

তারপর:

```
Publish Listing
```

Listing automatically seller-এর account-এর সঙ্গে যুক্ত হবে।

---

# 11. Book Condition System

Seller নিজের ইচ্ছামতো শুধু "ভালো" লিখবে না।

Standard condition রাখা হবে।

```
Like New
Good
Used
Heavily Used
```

এর পাশাপাশি condition details:

```
No Missing Pages
Writing Present
Highlighting Present
Cover Damage
Page Damage
```

এতে buyer আগে থেকেই বইয়ের physical condition সম্পর্কে ধারণা পাবে।

---

# 12. Book Image System

Initial version-এ আলাদা paid image hosting ব্যবহার করার দরকার নেই।

Recommended:

```
Supabase Storage
```

Architecture:

```
Next.js
   ↓
Supabase
   ├── Authentication
   ├── PostgreSQL Database
   └── Storage
         └── Book Images
```

Image upload হওয়ার আগে compression করা হবে।

Example:

```
4 MB Camera Photo
        ↓
Image Compression
        ↓
WebP
        ↓
300–700 KB
        ↓
Supabase Storage
```

প্রতিটি book-এর জন্য multiple photos রাখা যাবে।

Example:

```
Front Cover
Back Cover
Inside Pages
Damage / Writing
```

---

# 13. Book Details Page

একজন buyer কোনো book card-এ click করলে full details page খুলবে।

Page-এ:

```
Book Images
Book Name
Author
Subject Code
Department
Semester
Condition
Description
Original Price
Selling Price
Amount Saved
Seller Information
Seller Rating
Location
```

Example:

```
Original Price: ৳800
Selling Price: ৳450

You Save: ৳350
```

তারপর:

```
Buy Now
```

---

# 14. Book Status

প্রতিটি listing-এর status থাকবে।

```
Available
Reserved
Sold
Inactive
```

Flow:

```
Available
   ↓
Buyer Orders
   ↓
Reserved
   ↓
Pickup completed
   ↓
Sold
```

Payment/order cancel হলে আবার:

```
Reserved → Available
```

---

# 15. Book Request Feature

Marketplace-এর একটি গুরুত্বপূর্ণ future feature হবে:

"Request a Book"

যদি student কোনো বই খুঁজে কিন্তু listing না পায়, সে request তৈরি করবে।

Example:

```
Book: Electrical Technology
Subject Code: 26811
Semester: 4
Budget: ৳300
```

অন্য কোনো student পরে ওই বই list করলে matching requester notification পাবে।

---

# 16. Wishlist

Buyer book save করে রাখতে পারবে।

Example:

```
❤️ Save Book
```

Wishlist:

```
My Wishlist
```

পরে:

```
Book Price Changed
Book Sold
Similar Book Listed
```

এরকম notification দেওয়া যাবে।

---

# 17. Order System

Buyer:

```
Open Book
   ↓
Buy Now
   ↓
Confirm Order
   ↓
Payment
   ↓
Order Created
```

Order-এ থাকবে:

```
Order ID
Buyer
Seller
Book
Price
Platform Fee
Payment Status
Order Status
Pickup Point
Created At
```

---

# 18. Order Status System

Order status clearly defined থাকবে।

```
Pending Payment
Paid
Waiting for Drop-off
Dropped Off
Ready for Pickup
Picked Up
Completed
Cancelled
Disputed
```

এটা user এবং admin দুজনের জন্য visible থাকবে।

---

# 19. Campus Pickup/Drop-off Model

Platform-এর physical logistics-এর জন্য campus-এর মধ্যে একটি fixed pickup point থাকবে।

উদাহরণ:

```
Main Canteen
Campus Store
Security Desk
Student Representative
```

Database-এ pickup point আলাদা table হবে।

তথ্য:

```
Pickup Point Name
Location
Opening Time
Closing Time
Phone
Active Status
```

---

# 20. Seller Drop-off Flow

Buyer order করার পরে seller notification পাবে।

Example:

```
New Order Received

Book:
Electrical Technology

Order ID:
PX1048

Please drop off your book at:

Main Campus Pickup Point

Deadline:
Today, 6:00 PM
```

Seller book pickup point-এ জমা দেবে।

Pickup staff/admin book receive করবে।

তারপর order status:

```
Waiting for Drop-off
        ↓
Dropped Off
```

---

# 21. Buyer Pickup Flow

Seller বই জমা দেওয়ার পরে buyer notification পাবে।

Example:

```
Your book is ready for pickup.

Order ID:
PX1048

Pickup Point:
Main Campus Store
```

Buyer pickup point-এ যাবে।

তারপর verification হবে।

---

# 22. QR / PIN Verification

Order-এর জন্য unique verification code তৈরি হবে।

দুই ধরনের approach রাখা যায়:

Option A:

QR Code

Option B:

6-digit PIN

MVP-তে PIN রাখা সহজ।

Example:

```
Order ID: PX1048
Pickup PIN: 683921
```

Buyer pickup করার সময় PIN দেবে।

Staff/admin system-এ PIN verify করবে।

সঠিক PIN হলে:

```
Order → Picked Up
```

---

# 23. Payment System

Long-term goal হবে platform-mediated payment।

Flow:

```
Buyer
  ↓
Payment
  ↓
Platform
  ↓
Order Verification
  ↓
Buyer Receives Book
  ↓
Seller Payout
```

Payment methods:

```
bKash
Nagad
```

Future-এ payment provider integration করা যাবে।

MVP-তে payment status architecture আগে build করা হবে, পরে live gateway integration করা যাবে।

---

# 24. Platform Fee

Platform transaction থেকে fee নিতে পারবে।

Example:

Book price:

৳500

Platform fee:

5%

Platform fee:

৳25

Seller receives:

৳475

Database-এ আলাদা values রাখা হবে:

```
item_price
platform_fee
seller_payout
```

Percentage fixed না রেখে admin-configurable রাখা ভালো।

Example:

```
Platform Fee = 5%
```

Admin চাইলে later 7% করতে পারবে।

---

# 25. Payment Status

Payment-এর জন্য:

```
Pending
Paid
Failed
Refunded
Released
```

Seller payout:

```
Pending
Processing
Paid
Failed
```

---

# 26. Trust System

Marketplace-এর সবচেয়ে গুরুত্বপূর্ণ অংশগুলোর একটি হবে trust।

প্রতিটি completed transaction-এর পরে buyer এবং seller review দিতে পারবে।

Example:

```
⭐ 5
★★★★★
```

Review-এর সঙ্গে:

```
Transaction Verified
```

tag থাকবে।

শুধু completed order-এর review valid হবে।

---

# 27. User Reputation

Profile-এ factual transaction statistics দেখানো যেতে পারে।

Example:

```
Successful Sales: 14
Completed Purchases: 8
Cancellation Rate: 3%
Drop-off Completion: 100%
```

এতে profile reputation তৈরি হবে।

---

# 28. Fake Order Protection

একজন user বারবার order করে pickup না করলে system record রাখবে।

Possible status:

```
Normal
Warning
Restricted
Suspended
```

Admin action থাকবে।

যেমন:

```
Too many cancellations
Repeated no-show
Fraud report
Fake listing
```

---

# 29. Reporting System

Buyer book পাওয়ার সময় সমস্যার report করতে পারবে।

Report categories:

```
Condition mismatch
Wrong book
Missing pages
Damaged book
Fake listing
Seller issue
Other
```

Buyer photo upload করতে পারবে।

---

# 30. Dispute System

Report করলে order:

```
Disputed
```

হবে।

Admin দেখতে পারবে:

```
Book listing
Original images
Seller description
Buyer complaint
Order history
Payment status
Pickup verification
Uploaded evidence
```

তারপর admin action:

```
Release Payment
Refund
Partial Refund
Reject Dispute
```

---

# 31. Notification System

User notification পাবে:

```
New order
Payment confirmed
Seller drop-off reminder
Book dropped off
Book ready for pickup
Order completed
New review
Book request matched
Dispute update
```

Future-এ:

Browser notification

Email

SMS

যোগ করা যাবে।

---

# 32. Admin Panel

Admin panel হবে পুরো marketplace control করার জায়গা।

### Dashboard

```
Total Users
Active Listings
Orders Today
Completed Orders
Pending Orders
Disputes
Revenue
```

### Management

```
Users
Books
Orders
Payments
Payouts
Reviews
Reports
Disputes
Pickup Points
Book Requests
Departments
Semesters
Subjects
```

---

# 33. Admin Book Management

Admin:

```
Approve
Reject
Hide
Delete
Mark Sold
Edit
Report Review
```

করতে পারবে।

প্রথম version-এ automatic listing publish রাখা যায়।

পরে suspicious listing-এর জন্য moderation যোগ করা যাবে।

---

# 34. User Verification

প্রথম version:

Student ID / Roll

পরের version:

Institute email verification

Student ID verification

Admin approval

এতে campus-only marketplace-এর trust বাড়বে।

---

# 35. Database Architecture

Supabase PostgreSQL-এর জন্য core tables:

```
profiles
institutes
departments
semesters
subjects

books
book_images

orders
payments
payouts

pickup_points
pickup_events

reviews
book_requests
wishlist

notifications

reports
disputes
user_blocks

audit_logs
```

### Relationships

```
profiles
   │
   ├── books
   │
   ├── orders as buyer
   │
   ├── orders as seller
   │
   ├── reviews
   │
   └── book_requests
```

Book:

```
books
  ↓
book_images
```

Order:

```
order
 ├── buyer
 ├── seller
 ├── book
 ├── payment
 ├── pickup
 └── review
```

---

# 36. Technology Stack

### Frontend

Next.js

Recommended:

```
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
```

### Backend

Supabase

Used for:

```
Authentication
PostgreSQL
Storage
Realtime
```

### Hosting

```
Vercel
```

### Version Control

```
GitHub
```

### Image Storage

```
Supabase Storage
```

এতে initial project-এর জন্য আলাদা Sanity বা ImgBB প্রয়োজন হবে না।

---

# 37. Security

Database-level security খুব গুরুত্বপূর্ণ।

Supabase Row Level Security ব্যবহার করে rules দেওয়া হবে।

Example:

User A যেন User B-এর private information update করতে না পারে।

Seller যেন অন্য seller-এর listing edit করতে না পারে।

Buyer যেন অন্য buyer-এর order দেখতে না পারে।

Admin-এর জন্য separate protected access থাকবে।

Storage-এও user-specific upload rules থাকবে।

---

# 38. Main Pages

Customer-facing pages:

```
/
 /browse
 /book/[id]
 /sell
 /orders
 /orders/[id]
 /wishlist
 /requests
 /profile
 /notifications
 /login
 /register
```

Admin:

```
/admin
/admin/users
/admin/books
/admin/orders
/admin/payments
/admin/payouts
/admin/disputes
/admin/reports
/admin/pickup-points
/admin/settings
```

---

# 39. MVP Version

প্রথম version-এ শুধু essential system build করো।

### Phase 1

```
Authentication
Institute profile
Book listing
Book image upload
Search
Filter
Book details
```

### Phase 2

```
Order system
Order status
Pickup point
QR/PIN verification
Notifications
```

### Phase 3

```
Payment integration
Platform fee
Seller payout
Reviews
Reporting
Disputes
```

### Phase 4

```
Book Requests
Wishlist
Advanced reputation
Multiple institutes
Bundles
Offers
```

---

# 40. Initial Zero-Investment Architecture

প্রথম version-এর জন্য:

```
Next.js
       ↓
Vercel
       ↓
Supabase
 ├── Auth
 ├── Database
 ├── Storage
 └── Realtime
       ↓
GitHub
```

এতে development শুরু করার জন্য paid infrastructure-এর উপর নির্ভরতা থাকবে না।

Usage limits এবং payment provider-এর commercial requirements project scale অনুযায়ী পরে review করতে হবে।

---

# 41. Complete User Journey

একজন buyer:

```
Register
   ↓
Select Institute
   ↓
Select Department
   ↓
Select Semester
   ↓
Browse Books
   ↓
Search
   ↓
Open Book
   ↓
Buy Now
   ↓
Payment
   ↓
Order Confirmed
   ↓
Seller Drops Book
   ↓
Buyer Gets Notification
   ↓
Buyer Goes to Pickup Point
   ↓
PIN/QR Verification
   ↓
Book Received
   ↓
Order Completed
   ↓
Review
```

একজন seller:

```
Login
   ↓
Sell Now
   ↓
Upload Images
   ↓
Add Book Information
   ↓
Set Price
   ↓
Publish
   ↓
Receive Order
   ↓
Drop Book
   ↓
Pickup Confirmed
   ↓
Payment Released
   ↓
Receive Review
```

---

# 42. Business Model

Platform-এর initial revenue model:

```
Transaction Fee
```

উদাহরণ:

10,000 টাকা total monthly transactions

5% fee

Revenue:

৳500

Future revenue:

```
Featured Listings
Sponsored Books
Institute Partnerships
Pickup Point Partnerships
Seller Subscription
```

MVP-তে extra monetization দরকার নেই।

---

# 43. Future Expansion

Project সফল হলে একই architecture দিয়ে:

```
Mymensingh Polytechnic
        ↓
Dhaka Polytechnic
        ↓
Other Polytechnic Institutes
        ↓
All Bangladesh Polytechnic Marketplace
```

পর্যন্ত scale করা সম্ভব।

Later:

```
Used Calculator
Drafting Tools
Lab Equipment
Drawing Instruments
Components
Stationery
Engineering Accessories
```

যোগ করা যাবে।

তবে শুরুতে focus শুধু used books-এর উপর রাখাই ভালো।

---

# 44. Final Product Definition

এক লাইনে project:

“একই পলিটেকনিক institute-এর students-এর মধ্যে ব্যবহৃত academic books কেনাবেচার জন্য একটি verified, campus-based marketplace, যেখানে digital ordering এবং campus pickup/drop-off-এর মাধ্যমে transaction সম্পন্ন হবে।”

আর product-এর core pillars:

```
Marketplace
+
Student Identity
+
Campus Pickup
+
Payment
+
Verification
+
Reputation
```

এই architecture ধরে build করলে project-টা একটি simple used-book website থেকে পূর্ণাঙ্গ campus marketplace-এর দিকে যাবে।