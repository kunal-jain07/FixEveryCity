# FixEveryCity
# 🌍 FixEveryCity

A smart civic issue reporting platform that allows citizens to report problems in their city such as potholes, garbage, broken streetlights, water leakage, and more.
Users can submit issues with location coordinates so authorities or communities can quickly identify and resolve them.

---

## 🚀 Problem Statement

Cities face many daily infrastructure issues like:

* Potholes
* Garbage accumulation
* Broken streetlights
* Water leakage
* Road damage

Most of these problems remain unresolved because **citizens don’t have an easy way to report them with exact location details**.

**FixEveryCity solves this problem by creating a centralized platform for reporting and tracking city issues.**

---

## 💡 Solution

FixEveryCity allows users to:

1. Login securely
2. Report civic issues
3. Add description of the problem
4. Submit exact location coordinates
5. Store the issue in a central database

This helps authorities or communities **identify problems quickly and act faster.**

---

## ✨ Features

* 🔐 User Authentication
* 📝 Issue Reporting Dashboard
* 📍 Location Coordinates Submission
* ☁️ Cloud Database Storage
* 📊 Issue Tracking System
* 🌐 Clean Web Interface

---

## 🛠️ Tech Stack

**Frontend**

* HTML
* CSS
* JavaScript

**Backend / Database**

* Supabase

**Tools**

* Antigravity IDE
* Git
* GitHub

---

## 📂 Project Structure

```
FixEveryCity
│
├── frontend
│   ├── index.html
│   ├── dashboard.html
│   ├── style.css
│   └── script.js
│
├── backend
│
├── supabase
│
├── README.md
└── .env.example
```

---

## 🗄️ Database Structure (Supabase)

Table: **issues**

| Field       | Type      | Description           |
| ----------- | --------- | --------------------- |
| id          | uuid      | Unique issue ID       |
| title       | text      | Issue title           |
| description | text      | Problem description   |
| latitude    | float     | Location latitude     |
| longitude   | float     | Location longitude    |
| created_at  | timestamp | Issue submission time |
| user_id     | uuid      | Reporter ID           |

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```
git clone https://github.com/kunal-jain07/FixEveryCity.git
```

---

### 2️⃣ Navigate to the Project

```
cd FixEveryCity
```

---

### 3️⃣ Setup Environment Variables

Create a `.env` file and add your Supabase credentials:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### 4️⃣ Run the Project

Open the frontend files in a browser or run with a local server.


---

## 🔮 Future Improvements

* 📱 Mobile application
* 🗺️ Interactive issue map
* 🔔 Real-time issue updates
* 🤖 AI-powered issue categorization
* 🏛️ Direct authority integration

---


Hackathon Project 🚀

---

## ⭐ Support

If you like this project, consider giving it a ⭐ on GitHub.
