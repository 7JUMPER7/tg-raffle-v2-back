import { Column, DataType, HasMany, Model, Table } from "sequelize-typescript";
import { TCaseItem } from "../helpers/Types";
import CaseOpening from "./CaseOpening.model";

@Table({
    tableName: "cases",
    timestamps: true,
    paranoid: true,
})
class Case extends Model<Case> {
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
    declare title: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare image: string | null;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
    })
    declare tonPrice: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
    })
    declare starsPrice: number;

    @Column({
        type: DataType.JSONB,
        allowNull: false,
    })
    declare items: TCaseItem[];

    @HasMany(() => CaseOpening)
    declare openings: CaseOpening[];
}

export default Case;
