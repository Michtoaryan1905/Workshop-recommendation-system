CREATE DATABASE IF NOT EXISTS workshop_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE workshop_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','organizer','admin') NOT NULL DEFAULT 'student',
  skills JSON NULL, interests JSON NULL,
  skill_level ENUM('Beginner','Intermediate','Advanced') DEFAULT 'Beginner',
  career_goal VARCHAR(255) DEFAULT '',
  preferred_location VARCHAR(100) DEFAULT '',
  preferred_mode ENUM('Any','Online','Offline') DEFAULT 'Any',
  status ENUM('active','blocked') NOT NULL DEFAULT 'active',
  ab_group ENUM('A','B') NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS workshops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category_id INT NOT NULL,
  sub_category VARCHAR(100) DEFAULT '',
  skills JSON NULL,
  difficulty ENUM('Beginner','Intermediate','Advanced') NOT NULL DEFAULT 'Beginner',
  instructor VARCHAR(120) NOT NULL,
  organizer_id INT NOT NULL,
  event_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  location VARCHAR(150) NOT NULL DEFAULT 'Online',
  mode ENUM('Online','Offline') NOT NULL DEFAULT 'Offline',
  capacity INT NOT NULL DEFAULT 30,
  available_seats INT NOT NULL DEFAULT 30,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  keywords JSON NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_status_date (status, event_date)
);

CREATE TABLE IF NOT EXISTS registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, workshop_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_workshop (user_id, workshop_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, workshop_id INT NOT NULL,
  rating TINYINT NOT NULL, comment TEXT,
  sentiment ENUM('Positive','Neutral','Negative') NULL,
  sentiment_confidence DECIMAL(4,2) NULL,
  hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review (user_id, workshop_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  review_id INT NOT NULL, reporter_id INT NOT NULL, reason VARCHAR(255) NOT NULL,
  status ENUM('open','dismissed','removed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, query VARCHAR(255) NOT NULL, parsed JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id)
);

-- clickstream: login, search, view_workshop, click_workshop, view_review, click_register, registration, review, rating, reco_click
CREATE TABLE IF NOT EXISTS events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, session_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(40) NOT NULL, workshop_id INT NULL, meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (event_type), INDEX idx_session (session_id, created_at), INDEX idx_workshop (workshop_id)
);

CREATE TABLE IF NOT EXISTS recommendation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, workshop_id INT NOT NULL,
  score DECIMAL(5,1) NOT NULL, reasons JSON NULL,
  algorithm ENUM('A','B') NOT NULL,
  clicked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rec (user_id, workshop_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL, message VARCHAR(300) NOT NULL, is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, action VARCHAR(60) NOT NULL, entity VARCHAR(40) NULL, entity_id INT NULL, details VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);
