class DataModel(object):
    def __init__(self, db) -> None:
        self.db = db

        """ refer_id composed with (refer_entity)_(refer_column)_fieldname_(option_code)"""
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS data_codes (
                eid BIGINT PRIMARY KEY,
                refer_entity TEXT NOT NULL,
                refer_column TEXT NOT NULL,
                option_code TEXT NOT NULL,
                option_abbr TEXT NOT NULL,
                option_description TEXT NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE (refer_entity, refer_column, option_code)
            )
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS users (
                eid BIGINT PRIMARY KEY,
                user_name TEXT NOT NULL UNIQUE,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                title TEXT NOT NULL,
                default_page TEXT,
                report_to INTEGER,
                vendor_of INTEGER,
                address TEXT,
                city TEXT,
                zip TEXT,
                country TEXT,
                phone TEXT,
                email TEXT,
                hash TEXT,
                roles TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            )
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS roles (
                eid	INTEGER PRIMARY KEY,
                role_name TEXT NOT NULL UNIQUE,
                description	TEXT,
                landing_page TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE user_role (
                eid	INTEGER PRIMARY KEY,
                user_id	INTEGER NOT NULL,
                role_id	INTEGER NOT NULL,
                is_primary	BOOLEAN,
                is_active	BOOLEAN NOT NULL DEFAULT TRUE,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("user_id","role_id")
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS accounts (
                eid	INTEGER PRIMARY KEY,
                acct_code	TEXT NOT NULL UNIQUE,
                acct_name	TEXT NOT NULL,
                is_active	BOOLEAN NOT NULL DEFAULT TRUE,
                comment	TEXT,
                acct_type	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS items (
                eid	INTEGER PRIMARY KEY,
                v_sku	TEXT NOT NULL UNIQUE,
                v_name	TEXT NOT NULL,
                category	TEXT NOT NULL,
                equivalent	TEXT,
                v_description	TEXT,
                quantity	INTEGER,
                comment	TEXT,
                vendor_code	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                eid	INTEGER PRIMARY KEY,
                order_id	INTEGER NOT NULL,
                item_id	INTEGER NOT NULL,
                direction	TEXT NOT NULL,
                quantity	INTEGER NOT NULL DEFAULT 0,
                status	TEXT NOT NULL,
                remark	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE(order_id, item_id)
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS trans_journal (
                eid	INTEGER PRIMARY KEY,
                tran_id	INTEGER NOT NULL,
                journal_date	TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                status_code	TEXT NOT NULL,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("tran_id","status_code")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS orders (
                eid	INTEGER PRIMARY KEY,
                title	TEXT NOT NULL,
                order_type	TEXT NOT NULL,
                status	TEXT NOT NULL DEFAULT 'init',
                link_order	INTEGER,
                vendor_id	INTEGER,
                model_id	INTEGER,
                remark	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("title","order_type")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS order_lines (
                eid	INTEGER PRIMARY KEY,
                order_id	INTEGER NOT NULL,
                v_sku	TEXT NOT NULL,
                quantity	INTEGER NOT NULL,
                item_id	INTEGER,
                tran_id	INTEGER,
                status	TEXT NOT NULL,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("order_id","v_sku")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS shipments (
                eid	INTEGER PRIMARY KEY,
                work_id	INTEGER NOT NULL UNIQUE,
                title	TEXT NOT NULL,
                status	TEXT NOT NULL,
                pallet_count	INTEGER,
                ship_id	INTEGER,
                trucker_id	INTEGER,
                ship_date	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                remark	TEXT,
                unit_per_container	INTEGER,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS assembly (
                eid	INTEGER PRIMARY KEY,
                title	TEXT NOT NULL UNIQUE,
                remark	TEXT,
                is_active	BOOLEAN NOT NULL DEFAULT TRUE,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS model (
                eid	INTEGER PRIMARY KEY,
                title	TEXT NOT NULL UNIQUE,
                assm_id	INTEGER NOT NULL,
                vendor_id	INTEGER,
                remark	TEXT,
                is_active	BOOLEAN NOT NULL DEFAULT TRUE,
                unit_per_container	INTEGER,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS assm_config (
                eid	INTEGER PRIMARY KEY,
                assm_id	INTEGER NOT NULL,
                category	TEXT NOT NULL,
                slot	INTEGER NOT NULL DEFAULT (1),
                is_scan	BOOLEAN NOT NULL DEFAULT TRUE,
                is_unique	BOOLEAN NOT NULL DEFAULT TRUE,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("assm_id","category","slot")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS assm_serial (
                eid	INTEGER PRIMARY KEY,
                order_id	INTEGER NOT NULL,
                serial_number	TEXT NOT NULL UNIQUE,
                activation_key	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS assm_part_serial (
                eid	INTEGER PRIMARY KEY,
                assm_serial	TEXT NOT NULL,
                assm_conf_id	INTEGER NOT NULL,
                category	TEXT NOT NULL,
                part_sn	TEXT NOT NULL,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                UNIQUE("assm_serial","assm_conf_id"),
                UNIQUE("assm_serial","category","part_sn")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS assm_part_change_log (
                eid	INTEGER PRIMARY KEY,
                assm_serial	TEXT NOT NULL,
                assm_conf_id	INTEGER NOT NULL,
                swap_in_sn	TEXT NOT NULL,
                swap_out_sn	TEXT NOT NULL,
                rma_no	TEXT,
                change_reason	TEXT NOT NULL DEFAULT repair,
                change_date	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT,
                FOREIGN KEY("assm_serial") REFERENCES "assm_serial"("serial_number"),
                FOREIGN KEY("assm_conf_id") REFERENCES "assm_config"("eid")
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS file_store_dir (
                eid	INTEGER PRIMARY KEY,
                file_name	TEXT NOT NULL UNIQUE,
                file_ext	TEXT NOT NULL,
                file_path	TEXT NOT NULL,
                file_size	TEXT NOT NULL,
                file_content_type	TEXT NOT NULL,
                original_name	TEXT,
                create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                create_user TEXT,
                last_update TIMESTAMP,
                last_user TEXT
            );
            """
        )
        self.db.execute_query(
            """
            CREATE TABLE IF NOT EXISTS user_token (
                eid	SERIAL,
                user_id	INTEGER NOT NULL,
                token	TEXT NOT NULL,
                token_ip	TEXT NOT NULL,
                token_time	TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("user_id","token")
            );
            """
        )

class DataMigrate(DataModel):
    def __init__(self, db) -> None:
        super().__init__(db)

    def migrate(self):
        msg = []
        msg.append(self.db.execute_query(
            """
            COPY data_codes(eid, refer_entity, refer_column, option_code, option_abbr, option_description, is_active, create_date, create_user, last_update, last_user)
            FROM 'C:\python\katfoodtwo\local/data_codes.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY users(eid,user_name,first_name,last_name,title,default_page,report_to,address,city,zip,country,phone,email,hash,roles,create_date,create_user,last_update,last_user,vendor_of)
            FROM 'C:\python\katfoodtwo\local/users.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY roles(eid,role_name,description,landing_page,is_active,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/roles.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY accounts(eid,acct_code,acct_name,is_active,comment,acct_type,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/accounts.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY items(eid,v_sku,v_name,category,equivalent,v_description,quantity,comment,vendor_code,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/items.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY transactions(eid,order_id,item_id,direction,quantity,status,remark,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/transactions.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY trans_journal(eid,tran_id,journal_date,status_code,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/trans_journal.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY orders(eid,title,order_type,status,link_order,vendor_id,model_id,remark,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/orders.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY order_lines(eid,order_id,v_sku,quantity,item_id,tran_id,status,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/order_lines.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY shipments(eid,work_id,title,status,pallet_count,ship_id,trucker_id,ship_date,remark,create_date,create_user,last_update,last_user,unit_per_container)
            FROM 'C:\python\katfoodtwo\local/shipments.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY assembly(eid,title,remark,is_active,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/assembly.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY model(eid,title,assm_id,vendor_id,remark,is_active,create_date,create_user,last_update,last_user,unit_per_container)
            FROM 'C:\python\katfoodtwo\local/model.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY assm_config(eid,assm_id,category,slot,is_scan,is_unique,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/assm_config.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY assm_serial(eid,order_id,serial_number,activation_key,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/assm_serial.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY assm_part_serial(eid,assm_serial,assm_conf_id,category,part_sn,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/assm_part_serial.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY assm_part_change_log(eid,assm_serial,assm_conf_id,swap_in_sn,swap_out_sn,change_reason,change_date,create_date,create_user,last_update,last_user,rma_no)
            FROM 'C:\python\katfoodtwo\local/assm_part_change_log.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        msg.append(self.db.execute_query(
            """
            COPY file_store_dir(eid,file_name,file_ext,file_path,file_size,file_content_type,original_name,create_date,create_user,last_update,last_user)
            FROM 'C:\python\katfoodtwo\local/file_store_dir.csv'
            WITH (FORMAT csv, HEADER true);
            """
        ))
        # msg.append(self.db.execute_query(
        #     """
        #     COPY user_token(eid,user_id,token,token_ip,token_time)
        #     FROM 'C:\python\katfoodtwo\local/user_token.csv'
        #     WITH (FORMAT csv, HEADER true);
        #     """
        # ))
        print(msg)

    def post_migrate(self):
        msg = []
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM data_codes;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE data_codes_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE data_codes ALTER COLUMN eid SET DEFAULT nextval(''data_codes_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM users;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE users_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE users ALTER COLUMN eid SET DEFAULT nextval(''users_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM roles;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE roles_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE roles ALTER COLUMN eid SET DEFAULT nextval(''roles_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM accounts;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE accounts_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE accounts ALTER COLUMN eid SET DEFAULT nextval(''accounts_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM items;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE items_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE items ALTER COLUMN eid SET DEFAULT nextval(''items_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM transactions;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE transactions_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE transactions ALTER COLUMN eid SET DEFAULT nextval(''transactions_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM trans_journal;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE trans_journal_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE trans_journal ALTER COLUMN eid SET DEFAULT nextval(''trans_journal_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM orders;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE orders_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE orders ALTER COLUMN eid SET DEFAULT nextval(''orders_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM order_lines;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE order_lines_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE order_lines ALTER COLUMN eid SET DEFAULT nextval(''order_lines_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM shipments;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE shipments_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE shipments ALTER COLUMN eid SET DEFAULT nextval(''shipments_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM assembly;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE assembly_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE assembly ALTER COLUMN eid SET DEFAULT nextval(''assembly_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM model;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE model_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE model ALTER COLUMN eid SET DEFAULT nextval(''model_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM assm_config;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE assm_config_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE assm_config ALTER COLUMN eid SET DEFAULT nextval(''assm_config_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM assm_serial;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE assm_serial_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE assm_serial ALTER COLUMN eid SET DEFAULT nextval(''assm_serial_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM assm_part_serial;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE assm_part_serial_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE assm_part_serial ALTER COLUMN eid SET DEFAULT nextval(''assm_part_serial_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM assm_part_change_log;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE assm_part_change_log_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE assm_part_change_log ALTER COLUMN eid SET DEFAULT nextval(''assm_part_change_log_eid_seq'')';
            END $$;
            """
        ))
        msg.append(self.db.execute_query(
            """
            DO $$
            DECLARE
                max_eid INTEGER;
            BEGIN
                -- Get the current maximum eid
                SELECT COALESCE(MAX(eid), 0) INTO max_eid FROM file_store_dir;

                -- Create the sequence starting from max_eid + 1
                EXECUTE format('CREATE SEQUENCE file_store_dir_eid_seq START WITH %s', max_eid + 1);

                -- Set the default for eid to use the new sequence
                EXECUTE 'ALTER TABLE file_store_dir ALTER COLUMN eid SET DEFAULT nextval(''file_store_dir_eid_seq'')';
            END $$;
            """
        ))
        