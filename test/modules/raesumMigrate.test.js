import raesumConfig from '../../src/modules/raesumConfig';
import config from "config";
import {jest} from '@jest/globals';
import raesumMigrate from '../../src/modules/raesumMigrate.js';
import raesumDB from "../../src/modules/raesumDB.js";


describe("Raesum Migrate Schema File Validation", () => {
    test('Valid SQL Filenames Set',async ()=>{
        const migrator = new raesumMigrate();
        const configMock = jest.spyOn(migrator,"getMigrationsFileList").mockImplementation((key)=>{
            let returnVal;
                returnVal=[
                    "1.sql",
                    "2.sql"
                ]
            return returnVal
        });

        expect(migrator.getValidMigrationsAvailableList()).toEqual(["1.sql","2.sql"]);

    });

    test('Invalid SQL Filenames Set: Bad names',async ()=>{
        const migrator = new raesumMigrate();

        const configMock = jest.spyOn(migrator,"getMigrationsFileList").mockImplementation((key)=>{
            let returnVal;
            returnVal=[
                "1.initial.sql",
                "2.sql"
            ]
            return returnVal
        });

        expect(()=>{
            migrator.getValidMigrationsAvailableList()
        }).toThrow('1.initial.sql is not a valid filename');

    });

    test('Invalid SQL Filenames Set: Gaps',async ()=>{
        const migrator = new raesumMigrate();

        const configMock = jest.spyOn(migrator,"getMigrationsFileList").mockImplementation((key)=>{
            let returnVal;
            returnVal=[
                "1.sql",
                "3.sql"
            ]
            return returnVal
        });

        expect(()=>{
            migrator.getValidMigrationsAvailableList()
        }).toThrow('3.sql skips a migration number');

    });

});

//
// describe("Raesume Migrate Get Schema Version", ()=>{
//
//     test("No table yet exists", async()=>{
//
//
//     });
//
//     test("Table exists", async()=>{
//         const configMock = jest.spyOn(raesumDB,"query").mockImplementation((key)=>{
//             let returnVal;
//             returnVal={
//                 rows:[1]
//             }
//             return returnVal
//         });
//
//     });
//
// })
