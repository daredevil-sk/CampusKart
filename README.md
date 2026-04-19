# CampusKart

A full-stack secure campus marketplace built with React, Node.js, and MongoDB. This platform allows students to buy, sell, and auction items within their campus community.

## Features

- **User Authentication**: Secure login and registration with JWT.
- **Product Listings**: Create, edit, delete, and view product listings.
- **Product Status Management**:
  - `available`: Product is available for purchase.
  - `pending_approval`: Product is awaiting admin approval.
  - `active_auction`: Product is part of a live auction.
  - `sold`: Product has been sold.
  - `removed`: Product has been removed by the admin.
  - `purchased`: Product has been purchased by a user.
- **Auction System**: Create and participate in live auctions.
- **Admin Dashboard**: Manage users and products.
- **Real-time Chat**: Chat with other users (currently under development).
- **Responsive Design**: Modern UI with glassmorphism effects.

## Tech Stack

### Frontend
- **React**: UI library
- **Tailwind CSS**: Styling
- **Lucide React**: Icon library

### Backend
- **Node.js**: Runtime
- **Express.js**: Web framework
- **MongoDB**: Database
- **JWT**: Authentication

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CampusKart
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   ADMIN_EMAIL=your_admin_email
   ADMIN_PASSWORD=your_admin_password
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory with the following variable:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### Running the Application

1. **Start the backend**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend**
   ```bash
   cd ../frontend
   npm run dev
   ```

3. **Access the application**
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
CampusKart/
├── backend/          # Node.js backend
│   ├── config/       # Database configuration
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Custom middleware
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   └── server.js     # Entry point
├── frontend/         # React frontend
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   └── App.jsx     # Main component
│   └── index.html    # Entry point
└── README.md         # Project documentation
```
