import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import Lottery from "./Lottery.model";
import User from "./User.model";
import Gift from "./Gift.model";

@Table({
    tableName: "lottery_participations",
    timestamps: true,
    paranoid: true,
})
class LotteryParticipation extends Model<LotteryParticipation> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Lottery)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare lotteryId: string;
    @BelongsTo(() => Lottery)
    declare lottery: Lottery;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare userId: string;
    @BelongsTo(() => User)
    declare user: User;

    @ForeignKey(() => Gift)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare giftId: string;
    @BelongsTo(() => Gift)
    declare gift: Gift;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0.0,
    })
    declare ticketsAmount: number;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    })
    declare isAnonymous: boolean;
}

export default LotteryParticipation;
