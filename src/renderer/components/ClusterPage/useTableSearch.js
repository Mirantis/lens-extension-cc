import { useState, useEffect } from 'react';
import { formatDate } from '../../rendererUtil';

/**
 * Check if a string is in ISO format
 * @param {string} str Text to check for a date.
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

  // builds indexes with arrays of strings from incoming object for future searching
  useEffect(() => {
    const searchData = (singleItem) => {
      let values;

      if (singleItem) {
        if (Array.isArray(singleItem)) {
          values = singleItem.flatMap((child) => searchData(child));
        } else if (typeof singleItem === 'object') {
          values = Object.keys(singleItem).flatMap((key) =>
            searchData(singleItem[key])
          );
        }
      }

      if (!values) {
        // cast to string since we can't iterate it
        values = [
          `${
            isIsoDate(singleItem) ? formatDate(singleItem, false) : singleItem
          }`, // Formatting in the same we assume dates are displayed so as to search text as the user see's it in the table.
        ];
      }

      return values;
    };

    const fetchData = () => {
      setSearchResults(searchItems);

      const searchInd = searchItems.map((singleItem) => {
        const allValues = searchData(singleItem);
        return { allValues };
      });

      setSearchIndex(searchInd);
    };

    fetchData();
  }, [searchItems]);

  // searches for a match of the search text and adds an object with the corresponding index to the search results
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
