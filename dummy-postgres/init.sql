DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
     id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     sku VARCHAR(255) UNIQUE NOT NULL,
     quantity_on_hand INT NOT NULL CHECK (quantity_on_hand >= 0)
);

CREATE TABLE orders (
     id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
     quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_orders_products_id ON orders(product_id);
