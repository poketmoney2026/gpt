# GPT Customer Data Center — Version 2 MongoDB

## Visit Flow
- প্রথম পেজের নাম এখন **Visit Panel**।
- User শুধু mobile number দেবে এবং **Visit** চাপবে।
- Number আগে থেকে account হিসেবে MongoDB-তে থাকলে dashboard খুলবে।
- Number না থাকলে access হবে না। Admin package/customer create করলে তখন user account তৈরি হবে।
- JWT web token ১ বছর valid থাকবে।

## MongoDB Setup
`.env.local` ফাইল তৈরি করে দিন:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=gpt_customer_data_center
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_NUMBERS=01741815153
```

## Features
- User Panel + Admin Panel একই dark/neon theme-এ।
- Admin number দিয়ে Visit করলে Admin Dashboard খুলবে।
- User account না থাকলে Visit বন্ধ থাকবে।
- Admin package/customer create করলে name, mobile, email, device, package type, days, price, payment status, note সব MongoDB-তে save হয়।
- Payment status default: **Unpaid**। Admin চাইলে Paid/Pending করতে পারবে।
- Countdown live: ৩০ দিন দিলে create/purchase time থেকে প্রতি second কমতে থাকবে।
- Admin panel data এখন table horizontal scroll নয়; mobile-friendly responsive card layout।
- Filters: search, status, package type, max days left।
- Review settings: user edit/delete direct save হবে নাকি review panel-এ যাবে।
- Review panel: Save করলে apply, Remove করলে reject/delete request remove।

## Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```
