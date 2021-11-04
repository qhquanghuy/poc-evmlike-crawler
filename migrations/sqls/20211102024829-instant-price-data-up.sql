/* Replace with your SQL commands */
CREATE TABLE IF NOT EXISTS instant_price_data(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    protocol_name VARCHAR(50) NOT NULL,
    token_name VARCHAR(50) NOT NULL,
    market_price DECIMAL(20,2) NOT NULL,
    time_record TIMESTAMP NOT NULL,
    connection_time TIMESTAMP DEFAULT NULL
)