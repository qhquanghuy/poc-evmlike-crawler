/* Replace with your SQL commands */
CREATE TABLE IF NOT EXISTS token_price_data(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    token_name VARCHAR(50) NOT NULL,
    time_record TIMESTAMP NOT NULL,
    record_at VARCHAR(50) NOT NULL,
    market_price DECIMAL(20,2) NOT NULL,
    volume DECIMAL(30,4) NOT NULL,
    open_price DECIMAL(20,2) NOT NULL,
    high_price DECIMAL(20,2) NOT NULL,
    low_price DECIMAL(20,2) NOT NULL,
    close_price DECIMAL(20,2) NOT NULL,
    candle_size VARCHAR(50) NOT NULL
)