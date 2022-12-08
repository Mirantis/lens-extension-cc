import { useState, useEffect } from 'react';
import { formatDate } from '../../rendererUtil';

/**
 * Check if a string is in ISO format
 * @param {string} str Unfiltered list of items to search.
 * @returns {boolean} `true` if string is in ISO format, `false` if no.
 */
const isIsoDate = (str) => {
  if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) {
    return false;
  }
  const d = new Date(str);
  return d instanceof Date && !isNaN(d) && d.toISOString() === str; // valid date
};

/**
 * Returns data, filtered by search query.
 * @param {string} searchText Text to be searched for.
 * @param {Array} searchItems Unfiltered list of items to search.
 * @returns {{ searchResults: Array }} Filtered search items.
 */
export const useTableSearch = ({ searchText, searchItems }) => {
  const [searchResults, setSearchResults] = useState([]); // {Array} filtered list of original `searchItems`
  const [searchIndex, setSearchIndex] = useState([]); // {Array<{ allValues: Array<string> }>} each item represents an object from `searchItems` with all its properties converted to strings

  useEffect(() => {
    const getDataForSearch = (singleItem, allValues) => {
      if (!allValues) {
        allValues = [];
      }
      for (let key in singleItem) {
        if (typeof singleItem[key] === 'object' && singleItem[key]) {
          getDataForSearch(singleItem[key], allValues);
        } else {
          allValues.push(
            `${
              isIsoDate(singleItem[key])
                ? formatDate(singleItem[key], false)
                : singleItem[key]
            }`
          );
        }
      }

      return allValues;
    };

    const fetchData = () => {
      setSearchResults(searchItems);

      const searchInd = searchItems.map((singleItem) => {
        const allValues = getDataForSearch(singleItem);
        return { allValues };
      });

      setSearchIndex(searchInd);
    };

    fetchData();
  }, [searchItems]);

  useEffect(() => {
    if (searchText) {
      setSearchResults(
        searchIndex.reduce((results, singleItem, index) => {
          const isSuccessfulSearch = singleItem.allValues
            .map((value) => value.toLowerCase())
            .some((value) => value.includes(searchText.toLowerCase()));

          if (isSuccessfulSearch) {
            results.push(searchItems[index]);
          }
          return results;
        }, [])
      );
    } else {
      setSearchResults(searchItems);
    }
  }, [searchText, searchItems, searchIndex]);

  return { searchResults };
};
