class DataHandle {
    constructor() {}

    get _headers_for_json() {
        const headers = new Headers();
        const jwt_token = localStorage.getItem('jwt_token');
        if (jwt_token) {
            headers.append(
                'Authorization',
                'Bearer ' + jwt_token
            );
        }
        headers.append(
            'Content-Type',
            'application/json'
        );

        return headers;
    }

    async _options_for_json(operation, body_data) {
        const options = {
            method: operation,
            cache: "no-cache",
            headers: this._headers_for_json,
        };
        if (operation == 'POST' && body_data) {
            options.body = JSON.stringify(body_data);
        }

        return options;
    }

    get _headers_for_file() {
        const headers = new Headers();
        const jwt_token = localStorage.getItem('jwt_token');
        if (jwt_token) {
            headers.append(
                'Authorization',
                'Bearer ' + jwt_token
            );
        }
        return headers;
    }

    async _options_for_file(operation, body_data) {
        let options = {
            method: operation,
            cache: "no-cache",
            headers: this._headers_for_file,
        };
        if (operation == 'POST' && body_data) {
            options.body = body_data;
        }

        return options;
    }

    async dataExchange(endpoint, data_body={}) {
        const options = await this._options_for_json('POST', data_body);
        let response = await fetch(endpoint, options);
        // console.log(response);
        let json_data = await response.json();
        let data = JSON.parse(json_data);
        return data;
    }

    async printFileExchange(endpoint, data_body={}) {
        const options = await this._options_for_json('POST', data_body);
        let response = await fetch(endpoint, options);
        let data = await response.blob();
        let repURL = URL.createObjectURL(data);

        let printWindow = window.open(repURL);
        printWindow.print();
        URL.revokeObjectURL(repURL);
        if (data) {
            return 'ok';
        } else {
            return 'ko';
        }
    }

    async fileExchange(endpoint, data_body={}) {
        const options = await this._options_for_json('POST', data_body);
        let response = await fetch(endpoint, options);
        const contentDisposition = response.headers.get('Content-Disposition');
        // console.log(contentDisposition, data_body);
        let data = await response.blob();
        let repURL = URL.createObjectURL(data);

        let anchor = document.createElement("a");
        anchor.href = repURL;
        if (contentDisposition) {
            const match = /filename="([^"]+)"/.exec(contentDisposition);
            if (match && match.length > 1) {
                const filename = match[1];
                // console.log(match, filename);
                anchor.download = filename;
            }
        }
        // let file_name = data_body.title + '_report.xlsx';
        // anchor.download = file_name;

        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(repURL)
        if (data) {
            return 'ok';
        } else {
            return 'ko';
        }
    }

    async fileUpload(endpoint, body_data) {
        // console.log(body_data);
        let options = await this._options_for_file('POST', body_data);
        let response = await fetch(endpoint, options);
        let json_data = await response.json();
        let data = JSON.parse(json_data);
        return data;
    }

    async post(endpoint, body_data) {
        const options = this._options_for_json('POST', body_data)

        let response = await fetch(endpoint, options);
        let json_data = await response.json();
        let data = JSON.parse(json_data);
        return data;
    }

    async get(endpoint) {
        const options = this._options_for_json('GET');
        // console.log(endpoint, options);
        let response = await fetch(endpoint, options);
        // console.log('response', response);
        // console.log('body', response.body);
        let json_data = await response.json();
        // json_data.forEach(row => console.log(row));
        // console.log('json data: ', json_data);
        // let data = JSON.parse(json_data);
        return json_data;
    }

    async pivotData(source_data, data_key, field_key, field_val) {
        let pivot_data = [];
        if (source_data.length > 0) {
            source_data.forEach(row => {
                let current_row = pivot_data.find(item => item[data_key] === row[data_key]);
                if (current_row) {
                    // const new_field = {[row[field_key]]:row[field_val]};
                    // current_row = {...current_row, ...new_field};
                    current_row[row[field_key]] = row[field_val];
                } else {
                    current_row = {[data_key]:row[data_key]};
                    current_row[row[field_key]] = row[field_val];
                    pivot_data.push(current_row);
                }
            });
        }
        return pivot_data;
    }
}

export { DataHandle }