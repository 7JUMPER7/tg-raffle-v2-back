import { TGift } from "../helpers/Types";
import Gift from "../models/Gift.model";
import { v4 } from "uuid";

const SLUG_REPLACER = "**slug**";
const BASE_IMAGE_URL = `https://nft.fragment.com/gift/${SLUG_REPLACER}.medium.jpg`;

class GiftDBController {
    create = async (
        userId: string,
        importUserTgId: string,
        importMsgId: number,
        slug: string,
        ticketsPrice: number,
        backdropColor?: string
    ) => {
        try {
            const uuid = v4();
            const image = BASE_IMAGE_URL.replace(SLUG_REPLACER, slug);
            const gift = await Gift.create({
                id: uuid,
                userId,
                importUserTgId,
                importMsgId,
                slug,
                image,
                backdropColor,
                ticketsPrice,
            } as Gift);
            return gift;
        } catch (e: any) {
            console.error("GiftDBController create error:", e.message);
            return null;
        }
    };

    get = async (id: string) => {
        try {
            const gift = await Gift.findOne({
                where: {
                    id,
                    withdrawnAt: null,
                },
            });
            return gift;
        } catch (e: any) {
            console.error("GiftDBController get error:", e.message);
            return null;
        }
    };

    getBySlug = async (slug: string) => {
        try {
            const gift = await Gift.findOne({
                where: {
                    slug,
                    withdrawnAt: null,
                },
            });
            return gift;
        } catch (e: any) {
            console.error("GiftDBController getBySlug error:", e.message);
            return null;
        }
    };

    getBatch = async (ids: string[]) => {
        try {
            const gifts = await Gift.findAll({
                where: {
                    id: ids,
                    withdrawnAt: null,
                },
            });
            return gifts;
        } catch (e: any) {
            console.error("GiftDBController getBatch error:", e.message);
            return [];
        }
    };

    delete = async (id: string) => {
        try {
            const gift = await Gift.destroy({
                where: {
                    id,
                },
            });
            return gift > 0;
        } catch (e: any) {
            console.error("GiftDBController delete error:", e.message);
            return null;
        }
    };

    parseGift = (gift: Gift): TGift => {
        return {
            slug: gift.slug,
            image: gift.image,
            tickets: gift.ticketsPrice,
        };
    };

    getFeeGifts = async (limit: number = 30) => {
        try {
            const gifts = await Gift.findAll({
                where: {
                    userId: null,
                    withdrawnAt: null,
                },
                order: [["ticketsPrice", "DESC"]],
                limit,
            });
            return gifts;
        } catch (e: any) {
            console.error("GiftDBController getFeeGifts error:", e.message);
            return [];
        }
    };
}

export default new GiftDBController();
