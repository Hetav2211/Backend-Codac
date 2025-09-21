# 🎵 Codac Backend API

<div align="center">
  
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  
  <p align="center">
    <a href="#-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-api-documentation">API Docs</a> •
    <a href="#-contributing">Contributing</a>
  </p>
</div>

## 📖 **Overview**

Codac Backend is a robust REST API powering the Codac music streaming platform. Built with Node.js and Express, it provides seamless music management, user authentication, and real-time features.

### **🔗 Related Repositories**
- **Frontend:** [Codac Frontend](https://github.com/Hetav2211/Frontend-Codac)


---

## ✨ **Features**



- 👤 **User Authentication** - Secure JWT-based auth system
- 📱 **RESTful API** - Clean and intuitive endpoints
- 🔄 **Real-time Updates** - WebSocket integration
- 🔒 **Security** - Input validation and rate limiting

---

## 🛠️ **Tech Stack**

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **JWT** | Authentication |
| **Multer** | File uploads |
| **Socket.io** | Real-time features |

---

## 📋 **API Endpoints**

<details>
<summary><b>🔐 Authentication Routes</b></summary>

```javascript
POST   /api/auth/register    // User registration
POST   /api/auth/login       // User login
POST   /api/auth/logout      // User logout
GET    /api/auth/profile     // Get user profile
PUT    /api/auth/profile     // Update profile
