/* Replace with your SQL commands */
CREATE TABLE IF NOT EXISTS protocol_information(
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    protocol_name_long VARCHAR(50) DEFAULT NULL,
    protocol_name_short VARCHAR(50) DEFAULT NULL,
    creation_time TIMESTAMP DEFAULT NULL,
    token_name VARCHAR(50) DEFAULT NULL,
    operating_chain VARCHAR(50) DEFAULT NULL,
    maximum_supply BIGINT UNSIGNED DEFAULT NULL,
    initial_price DECIMAL(32, 18) UNSIGNED DEFAULT NULL,
    service_provided VARCHAR(50) DEFAULT NULL,
    protocol_status ENUM('functioning', 'defunct', 'temporary defunct') DEFAULT NULL,
    latest_version VARCHAR(10) DEFAULT NULL,
    version_recorded_date TIMESTAMP DEFAULT NULL
)