import Env from '@ioc:Adonis/Core/Env'
import Shopify from 'App/Helpers/Shopify';

export default class ShopifyController {

    public async index({ request, response, logger }) {
        let data = request.all()
        logger.info("Test")

        if (!data.shop) {
            return response.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request.');
        }
        let { shop } = data;

        let redirectUri = Env.get("APP_URL") + `/shopify/callback`;
        let apiKey = Env.get('SHOPIFY_API_KEY');
        let scopes = Env.get('SHOPIFY_APP_SCOPES');

        let installationLink = Shopify.installationLink(shop, apiKey, scopes, redirectUri);

        return response.redirect().toPath(installationLink);
    }

    public async callback({ request, response, logger }) {
        let data = request.all()
        let { shop, hmac, code, state, timestamp } = data;

        if (shop && hmac && code && timestamp) {

            let apiKey = Env.get('SHOPIFY_API_KEY');
            let apiSecret = Env.get('SHOPIFY_API_SECRET');

            if (!Shopify.verifyHMAC(apiSecret, data)) {
                return response.status(400).send('HMAC validation failed.');
            }
            let accessToken = await Shopify.getAccessToken(shop, code, apiKey, apiSecret)
            logger.info("accesstoken");
            logger.info(accessToken);

            let shopify = new Shopify(accessToken);
            response.redirect().toPath(`https://${shop}/admin/apps`)
        }
    }

}