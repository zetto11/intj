-- CCTV Security Monitoring System (SOC) - Industrial Database
-- Generated for cctv_cam_db

CREATE DATABASE IF NOT EXISTS `cctv_cam_db`;
USE `cctv_cam_db`;

-- 1. USERS TABLE (RBAC SYSTEM)
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'operator', 'viewer') NOT NULL DEFAULT 'viewer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. CAMERAS TABLE
CREATE TABLE `cameras` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `zone` ENUM('Gate', 'Factory', 'Warehouse', 'Office') NOT NULL,
  `ip_simulated` VARCHAR(45) NOT NULL,
  `status` ENUM('online', 'offline') DEFAULT 'online',
  `is_blocked` BOOLEAN DEFAULT FALSE,
  `last_seen` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_camera_zone` (`zone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. ACCESS LOGS TABLE
CREATE TABLE `access_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `camera_id` INT DEFAULT NULL,
  `action` ENUM('view', 'block', 'unblock', 'login', 'logout') NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_access_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_access_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE SET NULL,
  INDEX `idx_access_timestamp` (`timestamp`),
  INDEX `idx_access_user_id` (`user_id`),
  INDEX `idx_access_camera_id` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. ALERTS TABLE (SECURITY EVENTS)
CREATE TABLE `alerts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('IDS', 'anomaly', 'system') NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  `description` TEXT NOT NULL,
  `camera_id` INT DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_alerts_camera` FOREIGN KEY (`camera_id`) REFERENCES `cameras` (`id`) ON DELETE SET NULL,
  INDEX `idx_alerts_timestamp` (`timestamp`),
  INDEX `idx_alerts_severity` (`severity`),
  INDEX `idx_alerts_camera_id` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. ANOMALIES TABLE
CREATE TABLE `anomalies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('failed_access', 'unusual_activity', 'camera_failure') NOT NULL,
  `description` TEXT NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_anomalies_timestamp` (`timestamp`),
  INDEX `idx_anomalies_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. SYSTEM LOGS TABLE
CREATE TABLE `system_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL,
  `message` TEXT NOT NULL,
  `user_id` INT DEFAULT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_system_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_system_timestamp` (`timestamp`),
  INDEX `idx_system_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================
-- INSERT SAMPLE TEST DATA
-- ==========================================

-- Test Users
INSERT INTO `users` (`username`, `password_hash`, `role`) VALUES
('admin', 'admin123', 'admin'),
('operator', 'operator123', 'operator'),
('viewer', 'viewer123', 'viewer');

-- Test Cameras
INSERT INTO `cameras` (`name`, `zone`, `ip_simulated`, `status`, `is_blocked`) VALUES
('Cam_Gate_Main', 'Gate', '192.168.1.101', 'online', FALSE),
('Cam_Gate_Post', 'Gate', '192.168.1.102', 'online', FALSE),
('Cam_Factory_Line1', 'Factory', '192.168.2.55', 'online', FALSE),
('Cam_Factory_Line2', 'Factory', '192.168.2.56', 'offline', FALSE),
('Cam_Warehouse_Loading', 'Warehouse', '192.168.3.10', 'online', FALSE),
('Cam_Warehouse_Aisle4', 'Warehouse', '192.168.3.11', 'online', FALSE),
('Cam_Office_Reception', 'Office', '192.168.4.20', 'online', FALSE),
('Cam_Office_ServerRoom', 'Office', '192.168.4.21', 'online', TRUE);

-- Test Alerts
INSERT INTO `alerts` (`type`, `severity`, `description`, `camera_id`, `timestamp`) VALUES
('system', 'high', 'Camera node Cam_Factory_Line2: Heartbeat lost.', 4, NOW()),
('system', 'low', 'Suspicious login attempt from unknown IP: 45.2.1.99', NULL, NOW()),
('IDS', 'critical', 'IDS Warning: Distributed port scan detected on core network.', NULL, NOW()),
('anomaly', 'medium', 'Anomaly: Unusual motion pattern detected in Factory Zone after hours.', 3, NOW()),
('IDS', 'high', 'IDS Warning: Brute force attempt on SSH port (22).', NULL, NOW());

-- Test Anomalies
INSERT INTO `anomalies` (`type`, `description`, `severity`, `timestamp`) VALUES
('failed_access', 'Unauthorized badge swipe at Entrance B.', 'medium', NOW()),
('unusual_activity', 'Multiple camera nodes reporting light fluctuation spikes.', 'low', NOW()),
('camera_failure', 'Cam_Factory_Line2 storage buffer overflow.', 'high', NOW());

-- Test System Logs
INSERT INTO `system_logs` (`event_type`, `message`, `user_id`, `timestamp`) VALUES
('AUTH_LOGIN', 'Administrator session initialized.', 1, NOW()),
('CONFIG_CHANGE', 'Camera Cam_Office_ServerRoom blocked by system policy.', NULL, NOW()),
('SYSTEM_STARTUP', 'SOC Dashboard Kernel Build 1.0.42 initialized.', NULL, NOW());

-- Test Access Logs
INSERT INTO `access_logs` (`user_id`, `camera_id`, `action`, `timestamp`) VALUES
(1, 1, 'view', NOW()),
(1, 8, 'block', NOW()),
(2, 5, 'view', NOW());
