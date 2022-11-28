import { render, screen } from 'testingUtility';
import { useTableSearch } from '../useTableSearch';

const name1 = 'Joe';
const surname1 = 'Doe';
const name2 = 'Donna';
const surname2 = 'Moon';

const mockedData = [
  {
    user: {
      name: name1,
      surname: surname1,
    },
  },
  {
    user: {
      name: name2,
      surname: surname2,
    },
  },
];

const TestComponent = ({ searchQuery }) => {
  const { searchedData } = useTableSearch({
    searchValue: searchQuery,
    data: mockedData,
  });

  return (
    <div>
      {searchedData.map((item, index) => (
        <p key={index}>{item.user.name + ' ' + item.user.surname}</p>
      ))}
    </div>
  );
};

describe('/renderer/components/ClusterPage/Events/useTableSearch', () => {
  it('renders an component, search query |is| empty', () => {
    render(<TestComponent searchQuery="" />);

    mockedData.forEach((item) => {
      expect(
        screen.getByText(`${item.user.name} ${item.user.surname}`)
      ).toBeInTheDocument();
    });
  });

  it('renders an component, search query |isn`t| empty', () => {
    render(<TestComponent searchQuery={name2} />);

    expect(screen.queryByText(`${name1} ${surname1}`)).not.toBeInTheDocument();
    expect(screen.getByText(`${name2} ${surname2}`)).toBeInTheDocument();
  });
});
