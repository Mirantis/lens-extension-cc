import { useState, useEffect } from 'react';

/**
 * Returns data, filtered by search query.
 * @param {string} searchQuery Search query.
 * @param {Array} data Origin data to filter.
 * @returns {Array} Filtered data.
 */
export const useTableSearch = ({ searchQuery, data }) => {
  const [searchedData, setSearchedData] = useState([]);
  const [origData, setOrigData] = useState([]);
  const [searchIndex, setSearchIndex] = useState([]);

  useEffect(() => {
    const getDataForSearch = (singleItem, allValues) => {
      if (!allValues) {
        allValues = [];
      }
      for (let key in singleItem) {
        if (typeof singleItem[key] === 'object') {
          getDataForSearch(singleItem[key], allValues);
        } else {
          allValues.push(singleItem[key] + ' ');
        }
      }

      return allValues;
    };

    const fetchData = () => {
      setOrigData(data);
      setSearchedData(data);

      const searchInd = data.map((singleItem) => {
        const allValues = getDataForSearch(singleItem);
        return { allValues: allValues.toString() };
      });

      setSearchIndex(searchInd);
    };

    fetchData();
  }, [data]);

  useEffect(() => {
    if (searchQuery) {
      const reqData = searchIndex.map((singleItem, index) => {
        if (
          singleItem.allValues
            .toLowerCase()
            .indexOf(searchQuery.toLowerCase()) >= 0
        ) {
          return origData[index];
        }
        return null;
      });

      setSearchedData(
        reqData.filter((singleItem) => {
          if (singleItem) {
            return true;
          }
          return false;
        })
      );
    } else {
      setSearchedData(origData);
    }
  }, [searchQuery, origData, searchIndex]);

  return { searchedData };
};
