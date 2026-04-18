CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);


INSERT INTO users (name, email, password) VALUES ('Admin User', 'admin@example.com', '$2a$10$X.fO9PeyF0Lq0lF8uV6G9u4Vb4e5T0rF8l/JzM6S7X9u4Vb4e5T0r'); -- password: password123


