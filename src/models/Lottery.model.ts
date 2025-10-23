import { BelongsTo, Column, DataType, HasMany, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";
import LotteryParticipation from "./LotteryParticipation.model";
import { ELotteryStatus } from "../helpers/Enums";

@Table({
    tableName: "lotteries",
    timestamps: true,
    paranoid: true,
})
class Lottery extends Model<Lottery> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare status: ELotteryStatus;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
    })
    declare winnerId: string | null;
    @BelongsTo(() => User)
    declare winner?: User;

    @ForeignKey(() => LotteryParticipation)
    @Column({
        type: DataType.UUID,
    })
    declare winParticipationId: string | null;
    @BelongsTo(() => LotteryParticipation)
    declare winParticipation?: LotteryParticipation;

    @HasMany(() => LotteryParticipation)
    declare participations: LotteryParticipation[];

    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare expiresAt: Date | null;
}

export default Lottery;
