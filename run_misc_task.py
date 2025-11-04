from servicehandle import postgresqlhandle

from appdata import Settings
settings = Settings()

pg_handle = postgresqlhandle.PostgresqlHandle(settings)

pg_handle._test_conn()

# from misc.postgres_migration import DataMigrate
# migrate = DataMigrate(pg_handle)

# migrate.post_migrate()

# q_cmd = """
#     SELECT o.*, TO_CHAR(o.create_date, 'YYYY-MM-DD') AS CreationDate, m.title AS model_name, ac.acct_name, COALESCE(scan.scan_count, 0)::text || '/' || COALESCE(asm.quantity, 0)::text AS quantity, scan.scan_count, shp.ship_status 
#     FROM orders o LEFT JOIN model m ON o.model_id = m.eid 
#             LEFT JOIN accounts ac ON o.vendor_id = ac.eid 
#             LEFT JOIN (SELECT order_id, COUNT(*) AS quantity FROM assm_serial GROUP BY order_id) asm ON o.eid = asm.order_id 
#             LEFT JOIN (SELECT a.order_id, COUNT(DISTINCT aps.assm_serial) AS scan_count FROM assm_part_serial aps INNER JOIN assm_serial a ON aps.assm_serial = a.serial_number GROUP BY a.order_id) scan ON o.eid = scan.order_id 
#             LEFT JOIN (SELECT title, status || '_' || TO_CHAR(last_update, 'YYYY-MM-DD') AS ship_status FROM orders WHERE order_type = 'ship') shp ON o.title = shp.title 
#             WHERE o.order_type = 'work' ORDER BY o.eid DESC;
# """

# q_cmd = """
#     SELECT current_user;
# """

# q_cmd = """
#     SELECT title, order_type, create_date
#     FROM orders
#     ORDER BY eid DESC
#     LIMIT 5;
# """
# rst = pg_handle._read(q_cmd)

q_cmd = """
    UPDATE order_lines 
    SET quantity = %(quantity)s, last_user = %(last_user)s, last_update = %(last_update)s 
    WHERE eid = %(eid)s;
"""
q_params = {'order_id': 1764, 'eid': 29871, 'quantity': 90, 'last_user': 'metaadmin', 'last_update': '2025-11-03 15:16:17', 'direction': 'internal', 'status': 'inproduction'}

pg_handle.modify(q_cmd, q_params)

# print(rst)


