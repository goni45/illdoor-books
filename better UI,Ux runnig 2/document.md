# BTEB Default Book Catalog & Marketplace Stock Rules

> **Regulation:** 2022  
> **Initial marketplace scope:** Computer Science, Civil, Electrical, Mechanical, and Electronics Technology  
> **Primary directory source:** https://btebresultszone.com/booklists  
> **Detailed semester tables cross-checked from:** https://bteb-result-zone-one.vercel.app/booklist  
> **Prepared:** 20 September 2026

## 1. উদ্দেশ্য

Marketplace launch হওয়ার আগেই approved BTEB subjects-গুলো `books` table-এ default **Book Model** হিসেবে থাকবে। কোনো seller offer না থাকলেও model search/catalog-এ থাকবে; তবে সেটি `Unavailable` এবং `Stock 0` দেখাবে।

কেউ ওই model select করে Sell Book করলে নতুন `seller_listings` row তৈরি হবে এবং available stock স্বয়ংক্রিয়ভাবে বাড়বে।

## 2. Availability ও stock-এর authoritative rule

```text
available_stock = seller_listings-এর সংখ্যা
যেখানে:
  seller_listings.book_id = books.id
  এবং seller_listings.availability = 'Available'
```

```text
available_stock > 0  -> Available
available_stock = 0  -> Unavailable
```

Status অনুযায়ী গণনা:

| Listing status | Available stock-এ গণনা হবে? |
|---|---:|
| Available | হ্যাঁ |
| Reserved | না |
| Sold | না |
| Inactive | না |

আলাদাভাবে দেখানো যেতে পারে:

```text
total_copies = সব seller listings
available_stock = শুধু Available
reserved_copies = শুধু Reserved
sold_copies = শুধু Sold
```

`stock` আলাদা manually editable column হিসেবে রাখা উচিত নয়; seller listings থেকে derive করতে হবে। এতে stale stock হওয়ার ঝুঁকি থাকবে না।

## 3. গুরুত্বপূর্ণ curriculum modelling rule

একই subject code একাধিক department/semester-এ থাকতে পারে—যেমন `21011 Engineering Drawing`। তাই recommended structure:

```text
books
  id
  subject_code
  title
  common_image_url
  status

curriculum_entries
  id
  book_id -> books.id
  regulation
  technology_code
  department
  semester
  UNIQUE(book_id, regulation, technology_code, semester)
```

এতে একটি shared Book Model একাধিক department-এর catalog-এ দেখা যাবে, কিন্তু search-এ একই model অপ্রয়োজনীয়ভাবে duplicate হবে না।

Current schema-তে `department` ও `semester` সরাসরি `books`-এ থাকলে, launch seed-এর জন্য একই subject code-এর department-specific rows তৈরি করা যাবে; তবে long-term-এ `curriculum_entries` relation ব্যবহার করা বেশি নিরাপদ।

## 4. Default Book Model values

প্রতিটি seeded model-এর default behavior:

```text
status: active
common_image_url: admin placeholder/default cover
seller_count: 0 (derived)
available_stock: 0 (derived)
availability_label: Unavailable (derived)
lowest_price: null (derived)
```

প্রথম seller listing publish হলে:

```text
seller_count: 1
available_stock: 1
availability_label: Available
lowest_price: seller listing price
```

---

# 5. Computer Science & Technology (85)

## 1st Semester

| Subject Code | Subject Name |
|---|---|
| 21011 | Engineering Drawing |
| 25711 | Bangla-I |
| 25712 | English-I |
| 25911 | Mathematics-I |
| 25912 | Physics-I |
| 26611 | Computer Office Application |
| 26711 | Basic Electricity |

## 2nd Semester

| Subject Code | Subject Name |
|---|---|
| 25721 | Bangla-II |
| 25722 | English-II |
| 25812 | Physical Education & Life Skills Development |
| 25921 | Mathematics-II |
| 25922 | Physics-II |
| 26621 | Python Programming |
| 26622 | Computer Graphics Design-I |
| 26811 | Basic Electronics |

## 3rd Semester

| Subject Code | Subject Name |
|---|---|
| 25811 | Social Science |
| 25913 | Chemistry |
| 25931 | Mathematics-III |
| 26631 | Application Development Using Python |
| 26632 | Computer Graphics Design-II |
| 26633 | IT Support Services |
| 26831 | Digital Electronics-I |

## 4th Semester

| Subject Code | Subject Name |
|---|---|
| 25831 | Business Communication |
| 26641 | Java Programming |
| 26642 | Data Structure & Algorithm |
| 26643 | Computer Peripherals & Interfacing |
| 26644 | Web Design & Development-I |
| 26841 | Digital Electronics-II |
| 29041 | Environmental Studies |

## 5th Semester

| Subject Code | Subject Name |
|---|---|
| 25841 | Accounting |
| 26651 | Application Development Using Java |
| 26652 | Web Design & Development-II |
| 26653 | Computer Architecture & Microprocessor |
| 26654 | Data Communication |
| 26655 | Operating System |
| 26656 | Project Work-I |

## 6th Semester

| Subject Code | Subject Name |
|---|---|
| 25851 | Principles of Marketing |
| 25852 | Industrial Management |
| 26661 | Database Management System |
| 26662 | Computer Networking |
| 26663 | Sensor & IOT System |
| 26664 | Microcontroller Based System Design & Development |
| 26665 | Surveillance Security System |
| 26666 | Web Development Project |

## 7th Semester

| Subject Code | Subject Name |
|---|---|
| 25853 | Innovation & Entrepreneurship |
| 26671 | Digital Marketing Technique |
| 26672 | Network Administration & Services |
| 26673 | Cyber Security & Ethics |
| 26674 | Apps Development Project |
| 26675 | Multimedia & Animation |
| 26676 | Project Work-II |

## 8th Semester

| Subject Code | Subject Name |
|---|---|
| 29081 | Industrial Attachment & Project Presentation |

---

# 6. Civil Technology (64)

## 1st Semester

| Subject Code | Subject Name |
|---|---|
| 21011 | Engineering Drawing |
| 25711 | Bangla-I |
| 25712 | English-I |
| 25811 | Social Science |
| 25911 | Mathematics-I |
| 25913 | Chemistry |
| 26411 | Civil Engineering Materials |
| 26711 | Basic Electricity |

## 2nd Semester

| Subject Code | Subject Name |
|---|---|
| 25721 | Bangla-II |
| 25722 | English-II |
| 25812 | Physical Education & Life Skills Development |
| 25912 | Physics-I |
| 25921 | Mathematics-II |
| 26421 | Civil Engineering Drawing |
| 26811 | Basic Electronics |
| 27011 | Basic Workshop Practice |

## 3rd Semester

| Subject Code | Subject Name |
|---|---|
| 25831 | Business Communication |
| 25922 | Physics-II |
| 25931 | Mathematics-III |
| 26431 | Structural Mechanics |
| 26432 | Surveying-I |
| 26433 | Construction Process-I |
| 26611 | Computer Office Application |

## 4th Semester

| Subject Code | Subject Name |
|---|---|
| 25841 | Accounting |
| 26441 | Construction Process-II |
| 26442 | Estimating & Costing-I |
| 26443 | Civil CAD-I |
| 26444 | Surveying-II |
| 26445 | Geotechnical Engineering |
| 26446 | Hydrology |
| 26521 | Wood Workshop Practice |

## 5th Semester

| Subject Code | Subject Name |
|---|---|
| 25852 | Industrial Management |
| 26451 | Foundation Engineering |
| 26452 | Civil CAD-II |
| 26453 | Surveying-III |
| 26454 | Theory of Structure |
| 26455 | Water Supply Engineering |
| 26456 | Hydraulics |

## 6th Semester

| Subject Code | Subject Name |
|---|---|
| 26461 | Water Resources Engineering |
| 26462 | Advance Surveying |
| 26463 | Transportation Engineering-I |
| 26464 | Design of Structure-I |
| 28863 | Steel Structures |
| 28861 | Advanced Construction |
| 29041 | Environmental Studies |

## 7th Semester

| Subject Code | Subject Name |
|---|---|
| 25851 | Principles of Marketing |
| 25853 | Innovation & Entrepreneurship |
| 26471 | Civil Engineering Project |
| 26472 | Sanitary Engineering |
| 26473 | Transportation Engineering-II |
| 26474 | Design of Structure-II |
| 26475 | Estimating & Costing-II |
| 28871 | Construction Management & Documentation |

## 8th Semester

| Subject Code | Subject Name |
|---|---|
| 26481 | Industrial Attachment & Project Presentation |

---

# 7. Electrical Technology (67)

## 1st Semester

| Subject Code | Subject Name |
|---|---|
| 21011 | Engineering Drawing |
| 25711 | Bangla-I |
| 25712 | English-I |
| 25812 | Physical Education & Life Skills Development |
| 25911 | Mathematics-I |
| 25912 | Physics-I |
| 26711 | Basic Electricity |
| 26712 | Electrical Engineering Materials |

## 2nd Semester

| Subject Code | Subject Name |
|---|---|
| 25721 | Bangla-II |
| 25722 | English-II |
| 25921 | Mathematics-II |
| 25922 | Physics-II |
| 26721 | Electrical Circuits-I |
| 26722 | Electrical Engineering Drawing |
| 26811 | Basic Electronics |

## 3rd Semester

| Subject Code | Subject Name |
|---|---|
| 25931 | Mathematics-III |
| 25913 | Chemistry |
| 26611 | Computer Office Application |
| 26731 | Electrical Circuits-II |
| 26732 | Electrical Appliances |
| 26833 | Industrial Electronics |

## 4th Semester

| Subject Code | Subject Name |
|---|---|
| 25811 | Social Science |
| 25841 | Accounting |
| 26741 | Electrical Installation, Planning and Estimating |
| 26742 | DC Machine |
| 26743 | Electrical Engineering Project-I |
| 26845 | Digital Electronics |
| 27044 | Applied Mechanics |

## 5th Semester

| Subject Code | Subject Name |
|---|---|
| 25851 | Principles of Marketing |
| 25852 | Industrial Management |
| 26751 | Generation of Electrical Power |
| 26752 | Electrical & Electronic Measurements-I |
| 26753 | Testing and Maintenance of Electrical Equipments |
| 26754 | Electrical Engineering Project-II |
| 26853 | Microprocessor & Microcontroller |

## 6th Semester

| Subject Code | Subject Name |
|---|---|
| 26667 | Programming in C |
| 26761 | AC Machine-I |
| 26762 | Transmission and Distribution of Electrical Power-I |
| 26763 | Electrical & Electronic Measurements-II |
| 26842 | Communication Engineering |
| 29041 | Environmental Studies |

## 7th Semester

| Subject Code | Subject Name |
|---|---|
| 25831 | Business Communication |
| 25853 | Innovation & Entrepreneurship |
| 26771 | AC Machine-II |
| 26772 | Transmission and Distribution of Electrical Power-II |
| 26773 | Switch Gear and Protection |
| 26774 | Electrical Engineering Project-III |
| 26875 | Automation Engineering & PLC |

## 8th Semester

| Subject Code | Subject Name |
|---|---|
| 26781 | Industrial Attachment & Project Presentation |

---

# 8. Mechanical Technology (70)

## 1st Semester

| Subject Code | Subject Name |
|---|---|
| 21011 | Engineering Drawing |
| 25711 | Bangla-I |
| 25712 | English-I |
| 25812 | Physical Education & Life Skills Development |
| 25911 | Mathematics-I |
| 25912 | Physics-I |
| 27011 | Basic Workshop Practice |
| 27012 | Machine Shop Practice I |

## 2nd Semester

| Subject Code | Subject Name |
|---|---|
| 25721 | Bangla-II |
| 25722 | English-II |
| 25921 | Mathematics-II |
| 25922 | Physics-II |
| 26711 | Basic Electricity |
| 27021 | Mechanical Engineering Drawing |
| 27022 | Mechanical Engineering Materials |

## 3rd Semester

| Subject Code | Subject Name |
|---|---|
| 25811 | Social Science |
| 25831 | Business Communication |
| 25913 | Chemistry |
| 25931 | Mathematics-III |
| 26611 | Computer Office Application |
| 27031 | Machine Shop Practice II |
| 27231 | RAC Cycles & Components |

## 4th Semester

| Subject Code | Subject Name |
|---|---|
| 25841 | Accounting |
| 26811 | Basic Electronics |
| 27041 | Engineering Mechanics |
| 27042 | Machine Shop Practice III |
| 27043 | Metallurgy |
| 27131 | Engineering Thermodynamics |
| 29041 | Environmental Studies |

## 5th Semester

| Subject Code | Subject Name |
|---|---|
| 25852 | Industrial Management |
| 26667 | Programming in C |
| 27051 | Fluid Mechanics & Machineries |
| 27052 | Mechanical Estimating & Costing |
| 27053 | Advanced Welding-I |
| 27054 | Foundry & Pattern Making |
| 27055 | Manufacturing Process |

## 6th Semester

| Subject Code | Subject Name |
|---|---|
| 25851 | Principles of Marketing |
| 26211 | Automobile Fundamentals |
| 27061 | Strength of Materials |
| 27062 | Mechanical Measurement & Metrology |
| 27063 | CAD & CAM |
| 27064 | Advanced Welding-II |
| 27065 | Plant Engineering & Maintenance |

## 7th Semester

| Subject Code | Subject Name |
|---|---|
| 25853 | Innovation & Entrepreneurship |
| 27071 | Design of Machine Elements |
| 27072 | Tool Design |
| 27073 | Heat Treatment of Metal |
| 27074 | Mechanical Engineering Project |
| 27075 | Production Planning & Control |
| 29231 | Mechatronics & PLC |

## 8th Semester

| Subject Code | Subject Name |
|---|---|
| 27081 | Industrial Attachment & Project Presentation |

---

# 9. Electronics Technology (68)

## 1st Semester

| Subject Code | Subject Name |
|---|---|
| 21011 | Engineering Drawing |
| 25711 | Bangla-I |
| 25712 | English-I |
| 25911 | Mathematics-I |
| 25912 | Physics-I |
| 26711 | Basic Electricity |
| 26811 | Basic Electronics |

## 2nd Semester

| Subject Code | Subject Name |
|---|---|
| 25721 | Bangla-II |
| 25722 | English-II |
| 25811 | Social Science |
| 25812 | Physical Education & Life Skills Development |
| 25921 | Mathematics-II |
| 25922 | Physics-II |
| 26721 | Electrical Circuits-I |
| 26821 | Electronic Devices and Circuits |

## 3rd Semester

| Subject Code | Subject Name |
|---|---|
| 25913 | Chemistry |
| 25931 | Mathematics-III |
| 26611 | Computer Office Application |
| 26731 | Electrical Circuits-II |
| 26831 | Digital Electronics-I |
| 26832 | Power Electronics |

## 4th Semester

| Subject Code | Subject Name |
|---|---|
| 25841 | Accounting |
| 26741 | Electrical Installation, Planning and Estimating |
| 26742 | DC Machine |
| 26841 | Digital Electronics-II |
| 26842 | Communication Engineering |
| 26843 | Networks, Filters and Transmission Lines |
| 26844 | Electronic Servicing |

## 5th Semester

| Subject Code | Subject Name |
|---|---|
| 25851 | Principles of Marketing |
| 25852 | Industrial Management |
| 26667 | Programming in C |
| 26751 | Generation of Electrical Power |
| 26752 | Electrical & Electronic Measurements-I |
| 26851 | Television Engineering |
| 26852 | Electronic Appliances |
| 28654 | Bio-Medical Instruments |

## 6th Semester

| Subject Code | Subject Name |
|---|---|
| 26761 | AC Machine-I |
| 26762 | Transmission and Distribution of Electrical Power-I |
| 26763 | Electrical & Electronic Measurements-II |
| 26861 | TV Studio and Broadcasting |
| 26862 | Microcontroller and Embedded System |
| 26863 | PCB Design and Prototyping |
| 29041 | Environmental Studies |

## 7th Semester

| Subject Code | Subject Name |
|---|---|
| 25831 | Business Communication |
| 25853 | Innovation & Entrepreneurship |
| 26771 | AC Machine-II |
| 26772 | Transmission and Distribution of Electrical Power-II |
| 26871 | Microwave Radar and Navigation Aids |
| 26872 | Industrial Automation and PLC |
| 26873 | Control System and Robotics |
| 26874 | Electronic Project |

## 8th Semester

| Subject Code | Subject Name |
|---|---|
| 26881 | Industrial Attachment & Project Presentation |

---

# 10. BTEB Results Zone-এর Regulation 2022 technology directory

Primary directory-তে 41 technologies দেখানো হয়েছে। Initial five departments-এর পূর্ণ subject catalog উপরে দেওয়া হয়েছে। Remaining technologies একই seed format-এ পরবর্তী batch-এ যোগ করা যাবে।

| Technology | Directory Code |
|---|---:|
| Aircraft Maintenance Technology – Aerospace | 82 |
| Aircraft Maintenance Technology – Avionics | 83 |
| Apparel Manufacturing Technology | 14 |
| Architecture Technology | 61 |
| Automobile Technology | 62 |
| Ceramics Technology | 76 |
| Chemical Technology | 63 |
| Civil (Wood) Technology | 65 |
| Civil Technology | 64 |
| Computer Science & Technology | 85 |
| Construction Technology | 88 |
| Diploma in Agriculture | 23 |
| Diploma in Fisheries | 74 |
| Diploma in Forestry | 20 |
| Diploma in Livestock | 72 |
| Electrical Technology | 67 |
| Electromedical Technology | 86 |
| Electronics Technology | 68 |
| Environmental Technology | 90 |
| Fabric Manufacturing Technology | 12 |
| Fashion Design Technology | 16 |
| Food Technology | 69 |
| Footwear Technology | 98 |
| Glass Technology | 77 |
| Graphic Design Technology | 96 |
| Jute Product Manufacturing Technology | 15 |
| Marine Technology | 79 |
| Mechanical Technology | 70 |
| Mechatronics Technology | 92 |
| Merchandising and Marketing Technology | 17 |
| Petroleum and Mining Technology | 93 |
| Power Technology | 71 |
| Printing Technology | 95 |
| RAC Technology | 72 |
| Shipbuilding Technology | 80 |
| Surveying Technology | 78 |
| Telecommunication Technology | 94 |
| Textile Machine Design & Maintenance Technology | 18 |
| Tourism and Hospitality Management Technology | 99 |
| Wet Processing Technology | 13 |

> Directory page “41 Technologies” দেখালেও extracted list-এ পাওয়া visible entries উপরের table-এ রাখা হয়েছে। Production seed-এর আগে source directory-এর latest version দিয়ে count ও naming পুনরায় যাচাই করতে হবে।

## 11. UI behavior

### Catalog/Browse

সব seeded models দেখানো যাবে।

No offer অবস্থায় card:

```text
Unavailable
Stock 0
No seller offer yet
Sell this book
```

Offer থাকলে:

```text
Available
Stock X
From ৳Y
X sellers
```

### Sell Book

1. Department select
2. Semester select
3. Subject/model select
4. Condition, notes, price, pickup point
5. Seller Listing publish

Seller নতুন arbitrary subject title তৈরি করবে না। Model missing হলে admin/model request flow ব্যবহার করবে।

### Details page

- Common academic metadata সবসময় visible
- Available offers আলাদা cards
- No offer হলে purchase button hidden/disabled
- `Sell this book` CTA visible

## 12. Recommended SQL stock view

```sql
CREATE OR REPLACE VIEW public.book_marketplace_stock AS
SELECT
  b.id AS book_id,
  b.title,
  b.subject_code,
  count(l.id) FILTER (WHERE l.availability = 'Available')::int AS available_stock,
  count(DISTINCT l.seller_id) FILTER (WHERE l.availability = 'Available')::int AS seller_count,
  min(l.selling_price) FILTER (WHERE l.availability = 'Available') AS lowest_price,
  CASE
    WHEN count(l.id) FILTER (WHERE l.availability = 'Available') > 0
      THEN 'Available'
    ELSE 'Unavailable'
  END AS marketplace_availability
FROM public.books b
LEFT JOIN public.seller_listings l ON l.book_id = b.id
GROUP BY b.id, b.title, b.subject_code;
```

RLS/security review ছাড়া view-টি production-এ expose করা যাবে না। Institute-specific stock প্রয়োজন হলে seller profile-এর institute filter database query/RPC-তে অবশ্যই প্রয়োগ করতে হবে।

## 13. Seeding safeguards

- Seed operation idempotent হতে হবে।
- Unique logical key হিসেবে regulation + subject code ব্যবহার করা যেতে পারে।
- Department/semester mapping আলাদা relation-এ রাখলে shared subjects duplicate হবে না।
- Existing migrated Book Models overwrite করা যাবে না।
- Subject-name spelling differences report করতে হবে।
- Seed করার আগে database backup নিতে হবে।
- Seed শেষে orphan, duplicate code, missing semester এবং stock smoke tests চালাতে হবে।

## 14. Source note

BTEB Results Zone নিজেকে BTEB-এর official website হিসেবে দাবি করে না; এটি publicly available BTEB course information উপস্থাপন করে। Production catalog publish করার আগে official BTEB syllabus/curriculum document দিয়ে final verification করা recommended।
