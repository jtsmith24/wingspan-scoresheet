'use client';
import React, { useState } from "react";
import "./styles/sum-table-styles.css";

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
    <div className="ws-scoresheet flex border text-center text-sm sm:text-lg">
      <div className="divide-y divide-gray-200 text-xs">
        <div className="h-12"></div>
        <div className="flex h-36 items-center justify-center whitespace-nowrap bg-green-200">
          <div
            className="w-full text-black"
            style={{
              writingMode: "vertical-lr",
              textAlign: "center",
              transform: "rotate(180deg)",
            }}
          >
            Amount On Cards
          </div>
        </div>
        <div className="flex h-36 items-center justify-center whitespace-nowrap bg-blue-200">
          <div
            className="w-full text-black"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            1 Point Each
          </div>
        </div>
        <div className="h-12"></div>
      </div>
      <div className="divide-y divide-gray-200">
        <div className="h-12"></div>
        {rowHeaders.map((header, colIndex) => (
          <div
            key={colIndex}
            className="flex h-12 items-center justify-center overflow-hidden p-2 sm:whitespace-nowrap"
          >
            <span className="text-xs sm:inline-block">{header.full}</span>
          </div>
        ))}
        <div className="flex h-12 items-center justify-center overflow-hidden text-xs">
          Total
        </div>
      </div>
      <table
        id="sum-table"
        className="w-full table-auto divide-y divide-gray-200 border-l text-center"
      >
        <thead className="text-gray-900">
          <tr className="divide-x">
            {headerData.map((headerValue, colIndex) => (
              <th key={colIndex} className="h-12">
                <input
                  className="w-full text-center uppercase text-black sm:text-sm"
                  type="text"
                  value={headerValue}
                  onChange={e => handleHeaderChange(e, colIndex)}
                  onKeyDown={e => handleTableKeyDown(e, 0, colIndex, true)}
                  id={`header-${colIndex}-0`}
                  maxLength={3}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {tableData.map((row, rowIndex) => (
            <tr className="h-12 divide-x" key={rowIndex}>
              {row.map((cellValue, colIndex) => (
                <td
                  key={`${colIndex}-${rowIndex}`}
                  className="whitespace-nowrap"
                >
                  <input
                    className="custom-number-input w-full text-center sm:text-sm"
                    type="text"
                    value={cellValue}
                    onChange={e => handleInputChange(e, rowIndex, colIndex)}
                    pattern="\d*"
                    inputMode="numeric"
                    min={0}
                    max={999}
                    step={1}
                    onKeyDown={e =>
                      handleTableKeyDown(e, rowIndex, colIndex, false)
                    }
                    id={`input-${colIndex}-${rowIndex}`}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr className="h-12 divide-x">
            {Array(columns)
              .fill("")
              .map((_, colIndex) => (
                <td key={colIndex} className="text-sm font-semibold">
                  {calculateSum(colIndex)}
                </td>
              ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SumTable;
