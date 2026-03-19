# Recipe Scaler 🍳

Recipe Scaler is a modern, AI-powered mobile application built with Expo and React Native that helps users manage, scale, and discover recipes effortlessly. Integrating Gemini AI, the app provides smart features like recipe scanning from images and intelligent search.

## ✨ Features

- **Smart Recipe Scaling**: Instantly adjust ingredient quantities for any number of servings.
- **AI-Powered Search**: Find recipes using natural language (e.g., "something spicy with chicken") powered by Google's Gemini AI.
- **Recipe Scanning**: Import recipes directly from images using AI-driven OCR and parsing.
- **Cloud Sync**: Save and sync your favorite recipes across devices using Supabase.
- **Nutritional Insights**: Get estimated nutritional data for your ingredients.
- **Modern UI**: A sleek, dark-themed interface with smooth animations and a premium feel.

## 🛠 Tech Stack

- **Framework**: [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/)
- **Language**: TypeScript
- **AI Engine**: [Google Gemini AI](https://ai.google.dev/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Navigation**: Expo Router
- **Icons**: Expo Vector Icons (Lucide)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Expo Go](https://expo.dev/expo-go) app on your physical device or an emulator.
- A [Gemini API Key](https://aistudio.google.com/)
- A [Supabase Project](https://supabase.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Emadmazzawi/recipes-app.git
   cd recipes-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the root directory and add your keys (refer to `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your actual API keys:
   ```env
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```


## 🔒 Security

This project uses environment variables for all sensitive API keys. The `.env` file is included in `.gitignore` to prevent accidental exposure of credentials. A `.env.example` is provided for local setup.

## 📄 License

This project is for demonstration purposes. [MIT License](LICENSE) (or specify your own).
