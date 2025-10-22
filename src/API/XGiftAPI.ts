import axios, { AxiosInstance } from "axios";
import Lottery from "../models/Lottery.model";
import fs from "fs";
import { EBackdropColor } from "../helpers/Enums";

if (!process.env.XGIFT_API_KEY) {
    throw new Error("XGIFT_API_KEY not set");
}

class XGiftController {
    private api: AxiosInstance;
    private ceilCollections!: Record<EBackdropColor, Record<string, number>>;

    constructor() {
        this.api = axios.create({
            baseURL: "https://dev.xgift.tg",
            headers: {
                accept: "application/json",
                "XGIFT-AUTH-KEY": process.env.XGIFT_API_KEY!,
            },
        });
        this.loadCeilCollections();
    }

    loadCeilCollections = () => {
        try {
            const blackContent = fs.readFileSync("src/ceil_collections_black.json", "utf-8");
            const onyxBlackContent = fs.readFileSync("src/ceil_collections_onyx_black.json", "utf-8");
            this.ceilCollections = {
                [EBackdropColor.BLACK]: JSON.parse(blackContent),
                [EBackdropColor.ONYX_BLACK]: JSON.parse(onyxBlackContent),
            };
        } catch (e: any) {
            console.error("XGiftAPI loadCeilCollections error:", e.message);
            return {};
        }
    };

    fetchGiftPrice = async (slug: string): Promise<number | null> => {
        try {
            const { data } = await this.api.get(`/external-api/gifts/${slug}/price`);
            if (data && data.estimatedPrice) {
                return data.estimatedPrice;
            }
            return null;
        } catch (error: any) {
            console.error("XGiftAPI fetchGiftPrice error for gift", slug, ":", error.message);
            return null;
        }
    };

    calculateGiftTickets = async (slug: string, backdropColor: string | null | undefined): Promise<number> => {
        try {
            let maxTONPrice;
            if (backdropColor && this.ceilCollections[backdropColor as EBackdropColor]) {
                const collectionName = slug.split("-")[0];
                maxTONPrice = this.ceilCollections[backdropColor as EBackdropColor][collectionName];
            }

            let giftTONPrice = await this.fetchGiftPrice(slug);
            if (giftTONPrice) {
                if (maxTONPrice && giftTONPrice > maxTONPrice) {
                    giftTONPrice = maxTONPrice * 0.95;
                }
                return this.tonToTickets(giftTONPrice);
            }
            return 0;
        } catch (error: any) {
            console.error("XGiftAPI calculateGiftTickets error for gift", slug, ":", error.message);
            return 0;
        }
    };

    calculateTonToClaim = (lottery: Lottery) => {
        if (!lottery.participations || lottery.participations.length === 0) {
            return null;
        }
        const totalTicketsPrice = lottery.participations.reduce((sum, p) => sum + p.ticketsAmount, 0);
        const totalTon = this.ticketsToTon(totalTicketsPrice);
        return { tonValue: totalTon };
    };

    tonToTickets = (ton: number): number => {
        return Math.max(1, Math.round(ton * 10));
    };

    ticketsToTon = (tickets: number): number => {
        return parseFloat((tickets / 10).toFixed(9));
    };
}

export default new XGiftController();
