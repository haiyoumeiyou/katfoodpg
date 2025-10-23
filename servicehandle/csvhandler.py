import csv

from servicehandle.sqlitehandler import DatabaseHandler

db = DatabaseHandler('local/data.sqlite')

class CsvHandler(object):
    def __init__(self, folder:str='local') -> None:
        self.folder = folder

    def importFromCsv(self, file_path):
        with open(file_path, 'r') as file:
            return_list = []
            csv_data = csv.DictReader(file)
            for row in csv_data:
                return_list.append(row)
                # print('inside reader: ', row)
            return return_list
        
    def fromCsvToTable(self, import_file, q_table):
        file_path = '/'.join([self.folder, import_file])
        with open(file_path, 'r') as file:
            csv_data = csv.DictReader(file)

            for row in csv_data:
                print(row)
                print(db._query('insert', q_table, row, []))
            return csv_data
