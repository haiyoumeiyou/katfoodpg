class UiHandle {
    constructor(container) {
        this.ui_area = container;
        if (this.ui_area) {
            this.ui_area.innerHTML = '';
        }
        // console.log(container);
    }
    static getElement(selector) {
        const element = document.querySelector(selector);
        return element;
    }
    static getElements(selector) {
        const elements = document.querySelectorAll(selector);
        return elements;
    }
    static _checkDataType(data) {
        if ((typeof data) === 'object') {
            // console.log(data, 'is object...', data.constructor);
            if (Array.isArray(data)) {
                return 'Array';
            }
            return data.constructor;
        }
        return typeof data
    }
    static getMachineId() {
        let machineId = localStorage.getItem('MachineId');

        if (!machineId) {
            machineId = crypto.randomUUID();
            localStorage.setItem('MachineId', machineId);
        }

        return machineId;
    }
    static getLocalStorageItem(key) {
        return localStorage.getItem(key);
    }
    static setLocalStorageItem(key, val) {
        localStorage.setItem(key, val);

        return localStorage.getItem(key);
    }
    static assignParamsByDictFromDataset(params, attr_dict, source_data) {
        for (const [k, v] of Object.entries(attr_dict)) {
            if (v.includes(".")) {
                const v_splited = v.split(".");
                if (v_splited[0] in source_data && v_splited[1] in source_data[v_splited[0]][0]) {
                    params[k] = source_data[v_splited[0]][0][v_splited[1]];
                }
            } else {
                params[k] = source_data[v];
            }
        }
        return params;
    }
    static txtToJson(txt_data) {
        let all_lines = txt_data.split(/\r\n|\n/);
        let headers = all_lines[0].split(/\t|,/);
        let json_data = [];

        for(let i=1; i<all_lines.length; i++){
            let line = all_lines[i].split(/\t|,/);
            let row = {};

            if(line.length == headers.length){
                for(let j=0; j<headers.length; j++){
                    if (line[j].length > 0) {
                        row[headers[j]] = line[j];
                        json_data.push(row);
                    }
                }
            }
        }
        return json_data;
    }
    static calcTotal(total, amount, direction) {
        // console.log(total, amount, direction);
        return direction === '+' ? total + amount : (direction === '-' ? total - amount : total); 
    }
    static playSound(freq=440, wave_type='square', timeout=300) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        oscillator.type = wave_type;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        oscillator.connect(audioCtx.destination);
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
        }, timeout);
    }
    static checkInputValidatePattern(input_data, validation_pattern) {
        let result = [true, null]
        if (validation_pattern.length > 0) {
            validation_pattern.forEach(row => {
                for (const [k, v] of Object.entries(row)) {
                    console.log('checking...', k, v);
                    if (k.endsWith('startswith') && v && !input_data.startsWith(v)) { result = [false, "Not start with " + v]; break;}
                    if (k.endsWith('contains') && v && !input_data.includes(v)) { result = [false, "Not contain " + v]; break;}
                    if (k.endsWith('length') && v && input_data.length != v) { result = [false, "Length is not " + v]; break;}
                }
            });
        }
        return result;
    }
    static checkRequiredInput(input_data, required_fields) {
        let result = [true, null]
        if (required_fields.length > 0) {
            required_fields.forEach(field => {
                if (!(field in input_data && input_data[field])) {
                    result = [false, "Missing " + field + "!"];
                }
            });
        }
        return result;
    }
    static controllEnableCalcInScope(data, check_fields) {
        let enable_indicator = true;
        if (Array.isArray(data)) {
            data.forEach(row => {
                for (const [k, v] of Object.entries(check_fields)) {
                    // enable_indicator = (row[k] == v);
                    if (row[k] == v) {
                        enable_indicator = false;
                        return enable_indicator;
                    }
                    // console.log(enable_indicator);
                }
            });
        } else {
            for (const [k, v] of Object.entries(check_fields)) {
                // enable_indicator = (!data[k] == v);
                if (data[k] == v) {
                    enable_indicator = false;
                    return enable_indicator;
                }
            }
        }
        return enable_indicator;
    }
    static async pivotData(source_data, data_key, field_key, field_val) {
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
    static async listItemsFiltered(reference_list, checked_list, filter_on_field) {
        let filtered_list = [];
        checked_list.forEach(checked_item => {
            let filtered_item = reference_list.find(item => item[filter_on_field] == checked_item[filter_on_field]);
            if (filtered_item) {
                filtered_list.push(filtered_item);
            }
        });
        return filtered_list;
    }
    static async listSort(sort_list, sort_field, direction='asc') {
        sort_list.sort((a, b) => {
            const nameA = a[sort_field.sort];
            const nameB = b[sort_field.sort];
            if (nameA < nameB) return direction=='asc'?-1:1; 
            if (nameA > nameB) return direction=='asc'?1:-1;
            return 0;
        });
        return sort_list;
    }
    static async endpointDataValidate(endpoint_data) {
        
        return '/api/' + meta_section.replace('.json::', '/');
    }
    _resetContainerContent() {
        this.ui_area.innerHTML = "";
    }
    alertMessage(message, container, cssClass, timeout=2000) {
        const alert = this.createElement('p', cssClass);
        alert.textContent = message;
        container.prepend(alert);
        setTimeout(() => {
            alert.innerHTML = '';
            alert.remove();
        }, timeout);
    }
    createElement(tag, className) {
        const element = document.createElement(tag)

        if (className) {
            if (UiHandle._checkDataType(className) === 'string') {
                const class_list = className.split(' ');
                class_list.forEach(item => {
                    element.classList.add(item);
                });
            }
            if (UiHandle._checkDataType(className) === 'Array') {
                className.forEach(cn => {
                    element.classList.add(cn);
                });
            }
        }
        return element;
    }

    displayNavByRouteLocation(routes, locationElement) {
        const nav_list = this.createElement('ul');
        locationElement.appendChild(nav_list);
        routes.forEach(rt => {
            let found = rt.location.find(value => value == locationElement.name);
            if (found) {
                const listItem = this.createElement('li', rt.css_class?rt.css_class:null);
                const listBtn = this.createElement('button');
            
                listItem.appendChild(listBtn);
                listBtn.textContent = rt.name;
                listBtn.value = rt.path;
                
                nav_list.appendChild(listItem);
            }
        });
    }

    loadNavList(navList, locationElement, active_route) {
        const nav_list = this.createElement('ul');
        locationElement.appendChild(nav_list);
        navList.forEach(rt => {
            const listItem = this.createElement('li', rt.css_class?rt.css_class:null);
            const listBtn = this.createElement('button');
        
            listItem.appendChild(listBtn);
            listBtn.textContent = rt.name;
            listBtn.value = rt.path;
            if (active_route && rt.path === active_route) {
                listBtn.classList.add('active');
            }
            
            nav_list.appendChild(listItem);
        });
    }

    displaySearchBar(elementData) {

    }

    displayTitle(elementData, element) {
        const title = element?element:this.createElement('h2');
        title.textContent = elementData;
        if (!element) this.ui_area.appendChild(title);
    }
}

export { UiHandle }