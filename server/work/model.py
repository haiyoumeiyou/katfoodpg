from servicehandle.sqlitehandle import SqliteHandle

class WorkService:
    def __init__(self, db_path='local/data.sqlite'):
        self.db = SqliteHandle(db_path=db_path)

    def order(self):
        return []

    def order_search(self, title=None, vendor=None, model=None, begin_date=None, end_date=None):
        q_cmd = """
            SELECT o.*, strftime('%Y-%m-%d', datetime(o.create_date, '-08:00')) as CreationDate, 
                m.title as model_name, m.type_code, ac.acct_name, ifnull(scan.scan_count, 0) || '/' || ifnull(asm.quantity, 0) as quantity, 
                scan.scan_count, shp.ship_status 
            FROM orders o 
                LEFT JOIN model m ON o.model_id = m.eid 
                LEFT JOIN accounts ac ON o.vendor_id = ac.eid 
                LEFT JOIN (SELECT COUNT(*) as quantity, order_id 
                            FROM assm_serial GROUP BY order_id) as asm ON o.eid = asm.order_id 
                LEFT JOIN (SELECT count(DISTINCT aps.assm_serial) as scan_count, a.order_id 
                            FROM assm_part_serial aps INNER JOIN assm_serial a ON aps.assm_serial = a.serial_number GROUP BY a.order_id) as scan on o.eid = scan.order_id 
                LEFT JOIN (SELECT title, status || '_' || strftime('%Y-%m-%d', datetime(last_update, '-08:00')) ship_status FROM orders WHERE order_type = 'ship') as shp ON o.title = shp.title 
            WHERE o.order_type = 'work' 
        """
        params_list = []
        if title:
            q_cmd += f" AND o.title LIKE ?"
            params_list.append('%{}%'.format(title))
        if vendor:
            q_cmd += f" AND ac.acct_code LIKE ?"
            params_list.append('%{}%'.format(vendor))
        if model:
            q_cmd += f" AND m.title LIKE ?"
            params_list.append('%{}%'.format(model))
        if begin_date:
            q_cmd += f" AND o.create_date >= ?"
            params_list.append('{}'.format(begin_date))   
        if end_date:
            q_cmd += f" AND o.create_date <= ?"
            params_list.append('{}'.format(end_date))     
        order_clause = " ORDER BY o.eid DESC"
        q_cmd += order_clause
        params = tuple(params_list)
        # print(q_cmd, params)
        return self.db.execute_query(query=q_cmd, params=params)
        