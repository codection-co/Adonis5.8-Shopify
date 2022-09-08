const queryString = require('query-string');
const crypto = require('crypto');
import axios from 'axios'

class Shopify {

    accessToken: string;
    BaseURL: string;
    readonly SHOPIFY_API_VERSION = '2022-04';

    constructor(shop, accessToken: string) {
        this.accessToken = accessToken;
        this.BaseURL = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/`;
    }

    static installationLink(domain, apiKey: string, scopes: string, redirectUri: string) {
        const shop = Shopify.makeShopUrl(domain);
        const authUrl = Shopify.makeLoginUrl(shop, apiKey, scopes, redirectUri);
        return authUrl;
    }

    static makeShopUrl(shop) {
        let url = shop
        if (shop.search("https://") == -1 || shop.search("https://") != 0) {
            url = 'https://' + url
        }
        return url.replace(/\/$/, "")
    }

    static makeLoginUrl(domain, client_id, scope, redirect_uri,) {
        const url = {
            url: `${domain}/admin/oauth/authorize`,
            query: { client_id, redirect_uri, scope, }
        };
        return queryString.stringifyUrl(url);
    }

    static verifyHMAC(secretKey: string, data: any) {
        const hmac = data.hmac;
        delete data.hmac;
        const check = crypto.createHmac("sha256", secretKey).update(queryString.stringify(data)).digest("hex");
        return hmac == check
    }

    public async verifyProxy(request) {
        const secret = Config.get('shopify-api.api_secret')
        const message = request.get();
        const signature = message.signature;
        delete message.signature;
        const check = crypto.createHmac("sha256", secret).update(queryString.stringify(message)).digest("hex");
        return signature == check
    }

    public async verifyWebhook(request) {
        const secret = Config.get('shopify-api.api_secret')
        const header = request.header('X-Shopify-Hmac-SHA256');
        const check = crypto.createHmac("sha256", secret).update(request.raw()).digest("hex");
        return header == check
    }

    public async apiCall(type, API, data = []) {
        try {
            let config: any = {
                method: type,
                url: this.BaseURL + API,
                headers: {
                    "X-Shopify-Access-Token": this.accessToken,
                },
            }

            type == 'GET' ? config.params = data : config.data = data;
            return await axios(config);
        } catch (error) {
            return error;
        }
    }

    static async getAccessToken(shop, code, apiKey, apiSecret) {
        let url = `https://${shop}/admin/oauth/access_token`;
        let payload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code
        };

        try {
            let { data } = await axios.post(url, payload);
            console.log("response", data)
            if (data.access_token)
                return data.access_token;
            else
                return '';
        } catch (error) {
            console.log(error);
            return '';
        }
    }


    async getThemes() {
        let themes = await this.apiCall('GET', "themes.json");
        return themes;
    }

    async getActiveTheme() {
        let themes = await this.getThemes();
        let activeTheme = themes.find(t => t.role == 'main');
        return activeTheme;
    }

    async createThemePage(data = []) {
        let page = await this.apiCall('POST', "pages.json", data);
        return page;
    }

    async createLiquid(theme_id, data) {
        let page = await this.apiCall('POST', `${theme_id}/assets.json`, data);
        return page;
    }


}

export default Shopify