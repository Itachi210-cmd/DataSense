import csv
import os
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

def generate_supermarket_sales():
    filename = os.path.join(DATA_DIR, "supermarket_sales.csv")
    branches = {"A": "Yangon", "B": "Mandalay", "C": "Naypyitaw"}
    customer_types = ["Member", "Normal"]
    genders = ["Female", "Male"]
    product_lines = [
        "Health and beauty", "Electronic accessories", "Home and lifestyle",
        "Sports and travel", "Food and beverages", "Fashion accessories"
    ]
    payments = ["Ewallet", "Cash", "Credit card"]

    random.seed(42)
    start_date = datetime(2024, 1, 1)

    rows = []
    headers = [
        "Invoice ID", "Branch", "City", "Customer type", "Gender",
        "Product line", "Unit price", "Quantity", "Tax 5%", "Total",
        "Date", "Time", "Payment", "cogs", "gross margin percentage",
        "gross income", "Rating"
    ]

    for i in range(1, 1001):
        inv_id = f"{random.randint(100, 999)}-{random.randint(10, 99)}-{random.randint(1000, 9999)}"
        branch = random.choice(list(branches.keys()))
        city = branches[branch]
        cust_type = random.choice(customer_types)
        gender = random.choice(genders)
        prod_line = random.choice(product_lines)
        unit_price = round(random.uniform(10.0, 99.99), 2)
        qty = random.randint(1, 10)
        cogs = round(unit_price * qty, 2)
        tax = round(cogs * 0.05, 2)
        total = round(cogs + tax, 2)
        days_offset = random.randint(0, 90)
        order_date = (start_date + timedelta(days=days_offset)).strftime("%Y-%m-%d")
        order_time = f"{random.randint(10, 20):02d}:{random.randint(0, 59):02d}"
        payment = random.choice(payments)
        margin_pct = 4.76190476
        gross_income = tax
        rating = round(random.uniform(4.0, 10.0), 1)

        rows.append([
            inv_id, branch, city, cust_type, gender,
            prod_line, unit_price, qty, tax, total,
            order_date, order_time, payment, cogs, round(margin_pct, 4),
            gross_income, rating
        ])

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows in {filename}")

def generate_messy_customer_data():
    filename = os.path.join(DATA_DIR, "messy_customer_data.csv")
    random.seed(123)

    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
    departments = ["Engineering", "Sales", "Marketing", "Support", "Finance", "HR", "Operations"]
    countries = ["United States", "Canada", "United Kingdom", "Germany", "France", "Australia", "India"]

    headers = ["Customer ID", "Full Name", "Department", "Country", "Age", "Annual Spend ($)", "Satisfaction Score", "Churned", "Join Date"]
    rows = []

    for i in range(1, 201):
        cid = f"CUST-{1000 + i}"
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        name = f"{fn} {ln}"
        dept = random.choice(departments)
        country = random.choice(countries)
        
        # Inject realistic missing values
        age = random.randint(21, 68) if random.random() > 0.12 else ""
        spend = round(random.uniform(250.0, 8500.0), 2) if random.random() > 0.08 else ""
        sat = round(random.uniform(1.0, 5.0), 1) if random.random() > 0.10 else ""
        churned = random.choice(["True", "False", "Yes", "No"]) if random.random() > 0.05 else ""
        
        days_back = random.randint(30, 1000)
        join_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d") if random.random() > 0.06 else ""

        rows.append([cid, name, dept, country, age, spend, sat, churned, join_date])

    # Inject duplicate rows
    for _ in range(12):
        dup_row = list(random.choice(rows))
        rows.append(dup_row)

    random.shuffle(rows)

    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Generated {len(rows)} rows with duplicates & nulls in {filename}")

if __name__ == "__main__":
    generate_supermarket_sales()
    generate_messy_customer_data()
