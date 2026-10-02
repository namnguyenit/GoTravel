-- Apply to auth_db before deploying Identity with spring.jpa.hibernate.ddl-auto=validate.
-- Profiles belong to the shared Identity user; GoTicket owns routes, vehicles and bookings.
CREATE TABLE IF NOT EXISTS ticket_vendor_profiles (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
    approval_status VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_address VARCHAR(255) NOT NULL,
    representative_name VARCHAR(255) NOT NULL,
    representative_id_number VARCHAR(30) NOT NULL,
    tax_code VARCHAR(255),
    contact_phone VARCHAR(255),
    document_front_url VARCHAR(2048),
    document_back_url VARCHAR(2048),
    rejection_reason VARCHAR(1000),
    created_at TIMESTAMP(6),
    updated_at TIMESTAMP(6)
);
