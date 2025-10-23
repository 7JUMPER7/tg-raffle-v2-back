import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";
import User from "./User.model";
import Case from "./Case.model";
import { ECurrency, EGiftQuality } from "../helpers/Enums";

@Table({
    tableName: "cases_openings",
    timestamps: true,
    paranoid: true,
})
class CaseOpening extends Model<CaseOpening> {
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare id: string;

    @ForeignKey(() => Case)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare caseId: string;
    @BelongsTo(() => Case)
    declare case: Case;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare userId: string;
    @BelongsTo(() => User)
    declare user: User;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare giftSlug: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare giftImage: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare giftBackdropColor: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare giftQuality: EGiftQuality;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare currency: ECurrency;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
    })
    declare price: number;
}

export default CaseOpening;
