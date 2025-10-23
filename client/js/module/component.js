class Component {
    constructor(props={}) {
        this.props = props;
        this.state = {
            isLoading: true,
            message: null,
            error: null
        };
        // this.element = document.createElement('div');
        this.isRegistered = false;
        this.loadingElement = this.getLoadingElement();
        this.prepareElement();
    }
    getClassName() {
        return this.constructor.name;
    }
    async matchRoute(route) {
        const component_module = route.handler;
        const module = await import(component_module);
            
        // console.log('check for module_name: ', componentPath.hasOwnProperty('module_name'));
        if (route.hasOwnProperty('module_name')) {
            const module_name = route['module_name'];
            // console.log('module returned: ', componentPath['module_name'], module[module_name])
            return module[module_name];
        } else {
            // console.log('module returned default: ', module.default)
            return module.default;
        }
    }
    async onRouteChange(route) {
        console.log(`Route changed to ${route}`);
        const ComponentClass = await this.matchRoute(route);
        // console.log(`Class changed to`, ComponentClass);
        if (ComponentClass) {
            const componentInstance = new ComponentClass({});
            this.router.activeComponent = componentInstance;
            componentInstance.prepareElement();
            componentInstance.render();
            componentInstance.loadingElement.remove();
        } else {
            console.log("Route not found.");
            this.destroy();
        }
    }
    destroy() {
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
    }
    handleSample(event) {
        console.log('Document Sample event', event);
    }
    setState(new_state) {
        this.state = {...this.state, ...new_state};
        this.prepareElement();
        this.render();
        if (this.state.message) {
            this.alertMessage(this.state.message, this.state.timeout?this.state.timeout:2000);
            this.state.message = null;
            this.state.timeout = null;
        }
    }
    alertMessage(message, timeout=2000) {
        const alert = document.createElement('p');
        alert.textContent = message;
        this.element.prepend(alert);
        setTimeout(() => {
            alert.innerHTML = '';
            alert.remove();
        }, timeout);
    }
    getLoadingElement() {
        const loadingElement = document.createElement('div');
        loadingElement.textContent = 'Loading...';
        return loadingElement;
    }
    prepareElement() {
        // console.log(this.props.contentContainer);
        // console.log(this.props.container, typeof this.props.container, (this.props.container instanceof Element));
        if (this.props.containerID) {
            this.element = document.getElementById(this.props.containerID);
        }
        if (this.props.container && (this.props.container instanceof Element)) {
            this.element = this.props.container;
        }
        if (!this.element) {
            this.element = document.createElement('div');
        }
        while (this.element.firstChild) {
            this.element.removeChild(this.element.firstChild);
        }
        this.element.append(this.loadingElement);
    }
    render() {
        this.register();
        this.element.innerHTML = JSON.stringify(this.props) || 'Default content';
        console.log('Rendering with props:', this.props);

        return this.element;
    }
}
class ConfirmComponent extends Component {
    constructor(props) {
        super(props);
        const { validate_message, validate_text } = this.props;
        this.state = { validate_message, validate_text };
        this.handleYes = this.handleYes.bind(this);
        this.handleNo = this.handleNo.bind(this);
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.element.querySelectorAll('input, select')
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                if (input_element.value && input_element.value.length>0) {
                    inputs[input_element.id] = input_element.value;
                } else {
                    inputs[input_element.id] = null;
                }
            });
        }
        return inputs;
    }
    handleYes(event) {
        event.preventDefault();
        const inputs = this._inputs;
        if ("validate_text" in inputs) {
            if (inputs.validate_text === this.props.validate_text) {
                this.props.onConfirm(true);
                this.element.close();
            } else {
                this.setState({message: "incorrect confirm text, are you sure to do this?"})
            }
        }
    }
    handleNo(event) {
        event.preventDefault();
        this.element.close();
        this.props.onConfirm(false);
    }
    render() {
        const { validate_message } = this.state;

        const form = document.createElement('form');
        
        const confirm_message = document.createElement('p');
        confirm_message.textContent = validate_message;
        form.append(confirm_message);

        const validate_input = document.createElement('input');
        validate_input.type = 'text';
        validate_input.id = 'validate_text';
        form.append(validate_input);

        const btn_confirm = document.createElement('button');
        btn_confirm.type = 'submit';
        btn_confirm.textContent = 'Confirm';
        form.append(btn_confirm);
        btn_confirm.addEventListener('click', this.handleYes);

        const btn_cancel = document.createElement('button');
        btn_cancel.type = 'cancel';
        btn_cancel.textContent = 'Cancel';
        form.append(btn_cancel);
        btn_cancel.addEventListener('click', this.handleNo);

        this.element.append(form);
        this.loadingElement.remove();
        this.element.showModal();
    }
}
class ActionComponent extends Component {
    constructor(props) {
        super(props);
        const { validate_message, validate_text } = this.props;
        this.state = { validate_message, validate_text };
        this.handleYes = this.handleYes.bind(this);
        this.handleNo = this.handleNo.bind(this);
    }
    get _inputs() {
        let inputs = {};
        const input_elements = this.element.querySelectorAll('input, select')
        if (input_elements.length > 0) {
            input_elements.forEach(input_element => {
                if (input_element.value && input_element.value.length>0) {
                    inputs[input_element.id] = input_element.value;
                } else {
                    inputs[input_element.id] = null;
                }
            });
        }
        return inputs;
    }
    handleYes(event) {
        event.preventDefault();
        const inputs = this._inputs;
        if ("validate_text" in inputs) {
            if (inputs.validate_text === this.props.validate_text) {
                this.props.onConfirm(true);
                this.element.close();
            } else {
                this.setState({message: "incorrect confirm text, are you sure to do this?"})
            }
        }
    }
    handleNo(event) {
        event.preventDefault();
        this.element.close();
        this.props.onConfirm(false);
    }
    render() {
        const { validate_message } = this.state;

        const form = document.createElement('form');
        
        const confirm_message = document.createElement('p');
        confirm_message.textContent = validate_message;
        form.append(confirm_message);

        const validate_input = document.createElement('input');
        validate_input.type = 'text';
        validate_input.id = 'validate_text';
        form.append(validate_input);

        const btn_confirm = document.createElement('button');
        btn_confirm.type = 'submit';
        btn_confirm.textContent = 'Confirm';
        form.append(btn_confirm);
        btn_confirm.addEventListener('click', this.handleYes);

        const btn_cancel = document.createElement('button');
        btn_cancel.type = 'cancel';
        btn_cancel.textContent = 'Cancel';
        form.append(btn_cancel);
        btn_cancel.addEventListener('click', this.handleNo);

        this.element.append(form);
        this.loadingElement.remove();
        this.element.showModal();
    }
}