import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";
import CoinflipRoom from "./CoinflipRoom";
import Gift from "./Gift.model";

@Table({
    tableName: "coinflip_participations",
    timestamps: true,
    paranoid: true,
})
class CoinflipParticipation extends Model<CoinflipParticipation> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => CoinflipRoom)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare roomId: string;
    @BelongsTo(() => CoinflipRoom)
    declare room: CoinflipRoom;

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
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare side: number;
}

export default CoinflipParticipation;
