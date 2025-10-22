import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from "sequelize-typescript";
import Gift from "./Gift.model";
import LotteryParticipation from "./LotteryParticipation.model";
import Lottery from "./Lottery.model";
import { ELanguageCode } from "../helpers/Enums";

@Table({
    tableName: "users",
    timestamps: true,
    paranoid: true,
})
class User extends Model<User> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        unique: true,
    })
    declare telegramId: string;

    @Column({
        type: DataType.STRING,
    })
    declare telegramUsername: string | null;

    @Column({
        type: DataType.STRING,
    })
    declare telegramName: string | null;

    @Column({
        type: DataType.STRING,
    })
    declare telegramImage: string | null;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: ELanguageCode.EN,
    })
    declare telegramLanguage: ELanguageCode;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
    })
    declare referrerId: string | null;
    @BelongsTo(() => User, { onDelete: "SET NULL" })
    declare referrer?: User;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
    })
    declare tonBalance: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
    })
    declare pointsBalance: number;

    @Column({
        type: DataType.STRING,
        unique: true,
        allowNull: false,
    })
    declare referralCode: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
    })
    declare referralTicketsAmount: number;

    @ForeignKey(() => Lottery)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare enteredLotteryId: string | null;
    @BelongsTo(() => Lottery, { onDelete: "SET NULL" })
    declare enteredLottery?: Lottery;

    @ForeignKey(() => Lottery)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare wonLotteryId: string | null;
    @BelongsTo(() => Lottery, { onDelete: "SET NULL" })
    declare wonLottery?: Lottery;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare subscribedChannel: boolean;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare subscribedChat: boolean;

    @HasMany(() => Gift)
    declare gifts: Gift[];

    @HasMany(() => LotteryParticipation)
    declare participations: LotteryParticipation[];

    @HasMany(() => Lottery, { foreignKey: "winnerId" })
    declare lotteriesWon: Lottery[];
}

export default User;
