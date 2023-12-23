"use client";
import React, { useState } from "react";
import "./styles/sum-table-styles.css";
import { VerticalTextColumn } from "../VerticalTextColumn";

const SumTable = ({
  columns,
  rows,
  rowHeaders = [],
}: {
  columns: number;
  rows: number;
  rowHeaders: Array<{ full: string; icon: string; color: string }>;
}) => {
  const [tableData, setTableData] = useState(
    Array.from({ length: rows }, () => Array(columns).fill(""))
  );
  const [headerData, setHeaderData] = useState(Array(columns).fill(""));
  const handleInputChange = (e: any, rowIndex: number, colIndex: number) => {
    if (!validateNumberInput(e.target.value)) return;
    const newTableData = [...tableData];
    newTableData[rowIndex][colIndex] = e.target.value;
    setTableData(newTableData);
  };

  const handleHeaderChange = (e: any, colIndex: number) => {
    const newHeaderData = [...headerData];
    newHeaderData[colIndex] = e.target.value;
    setHeaderData(newHeaderData);
  };

  const calculateSum = (colIndex: number) => {
    return tableData.reduce(
      (sum, row) => sum + (parseInt(row[colIndex]) || 0),
      0
    );
  };

  const validateNumberInput = (input: any) => {
    const re = /^[0-9]+$/;
    if (input === "" || (re.test(input) && input.length < 4)) {
      return true;
    }
    return false;
  };

  const handleTableKeyDown = (
    e: any,
    rowIndex: number,
    colIndex: number,
    isHeaderRow: boolean
  ) => {
    if (e.code === "Enter" || e.key === "Enter") {
      e.preventDefault();
      const nextRowIndex = isHeaderRow ? 0 : rowIndex + 1;
      if (nextRowIndex < tableData.length) {
        const nextInput = document.querySelector(
          `#input-${colIndex}-${nextRowIndex}`
        ) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  return (
    <div className="flex text-center text-sm sm:text-lg p-2 sm:p-32">
      <div className="flex border-l-2 border-r-2 border-b-2 border-slate-500 drop-shadow-md">
        <div className="text-xs">
          <div className="empty-cell border-t-2 border-slate-500"></div>
          <VerticalTextColumn />
          <div className="empty-cell border-t-2 border-slate-500"></div>
        </div>
        <div>
          <div className="empty-cell border-t-2 border-slate-500"></div>
          {rowHeaders.map((header, colIndex) => (
            <div
              key={colIndex}
              className="row-head border-t-2 border-slate-500 flex items-center justify-center overflow-hidden p-2 sm:whitespace-nowrap"
            >
              <span className="text-xs sm:inline-block">{header.full}</span>
            </div>
          ))}
          <div className="row-head border-t-2 border-slate-500 flex items-center justify-center overflow-hidden text-xs">
            <p>Total</p>
          </div>
        </div>
      </div>
      <table id="sum-table" className="w-full text-center border-2 border-l-0 border-slate-500">
        <thead>
          <tr className="border-t-2 border-slate-500">
            {headerData.map((headerValue, colIndex) => (
              <th key={colIndex}>
                <input
                  className="text-center uppercase sm:text-sm"
                  placeholder={`P${colIndex + 1}`}
                  type="text"
                  value={headerValue}
                  onChange={(e) => handleHeaderChange(e, colIndex)}
                  onKeyDown={(e) => handleTableKeyDown(e, 0, colIndex, true)}
                  id={`header-${colIndex}-0`}
                  maxLength={3}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cellValue, colIndex) => (
                <td
                  key={`${colIndex}-${rowIndex}`}
                  className="whitespace-nowrap"
                >
                  <input
                    className="custom-number-input text-center sm:text-sm"
                    type="text"
                    value={cellValue}
                    onChange={(e) => handleInputChange(e, rowIndex, colIndex)}
                    pattern="\d*"
                    inputMode="numeric"
                    min={0}
                    max={999}
                    step={1}
                    onKeyDown={(e) =>
                      handleTableKeyDown(e, rowIndex, colIndex, false)
                    }
                    id={`input-${colIndex}-${rowIndex}`}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            {Array(columns)
              .fill("")
              .map((_, colIndex) => (
                <td key={colIndex} className="text-sm font-semibold">
                  {calculateSum(colIndex) == 0 ? <></> : calculateSum(colIndex)}
                </td>
              ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SumTable;
