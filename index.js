const apiUrl = 'https://s3-ap-southeast-1.amazonaws.com/he-public-data/books8f8fe52.json';
let db;
const dbReq = indexedDB.open('bookDatabase', 2);

async function bookApi(db, url) {
    // Storing response 
    document.getElementById('loadingText').innerText = 'creatind and indexing data locally from api...'
    const response = await fetch(url);

    // Storing data in form of JSON 
    const data = await response.json();
    if (response) {
        addBooksData(db, data);
    }
}
// Fires when the version of the database goes up, or the database is created
// for the first time
dbReq.onupgradeneeded = function (event) {
    db = event.target.result;

    // Create an object store named books, or retrieve it if it already exists.
    // Object stores in databases are where data are stored.
    let books;
    let cart;
    if (!db.objectStoreNames.contains('books')) {
        books = db.createObjectStore('books', {
            autoIncrement: true
        });
    } else {
        books = dbReq.transaction.objectStore('books');
    }
    if (!db.objectStoreNames.contains('cart')) {
        cart = db.createObjectStore('cart', {
            autoIncrement: true
        });
    } else {
        cart = dbReq.transaction.objectStore('cart');
    }

    // create indexes for book store
    if (!books.indexNames.contains('bookID')) {
        books.createIndex('bookID', 'bookID');
    }
    if (!books.indexNames.contains('title')) {
        books.createIndex('title', 'title');
    }
    if (!books.indexNames.contains('authors')) {
        books.createIndex('authors', 'authors');
    }
    if (!books.indexNames.contains('average_rating')) {
        books.createIndex('average_rating', 'average_rating');
    }
    if (!books.indexNames.contains('isbn')) {
        books.createIndex('isbn', 'isbn');
    }
    if (!books.indexNames.contains('language_code')) {
        books.createIndex('language_code', 'language_code');
    }
    if (!books.indexNames.contains('ratings_count')) {
        books.createIndex('ratings_count', 'ratings_count');
    }
    if (!books.indexNames.contains('price')) {
        books.createIndex('price', 'price');
    }
    if (!cart.indexNames.contains('bookID')) {
        cart.createIndex('bookID', 'bookID');
    }
}

// Fires once the database is opened (and onupgradeneeded completes, if
// onupgradeneeded was called)
dbReq.onsuccess = function (event) {
    document.getElementById('booklistSection').style.display = 'none';
    document.getElementById('navbar').style.display = 'none';
    // Set the db variable to our databas!  
    db = event.target.result;
    const tx = db.transaction(['books'], 'readonly');
    const store = tx.objectStore('books');
    const index = store.index('bookID');
    const countRequest = index.count();
    countRequest.onsuccess = function () {
        if (countRequest.result === 0) {
            bookApi(db, apiUrl);
            getCart(db);
        } else {
            getCart(db);
            getAndDisplayBooks(db);
        }
    }
}

// Fires when we can't open the database
dbReq.onerror = function (event) {
    alert('error opening database ' + event.target.errorCode);
}

function addBooksData(db, data) {
    const tx = db.transaction(['books'], 'readwrite');
    const store = tx.objectStore('books');

    for (const book of data) {
        let bookTitle = book.title;
        let bookTitleOrg = book.title;
        let bookAuthor = book.authors;
        let bookAuthorOrg = book.authors;
        if (typeof bookTitle !== 'number') {
            bookTitle = bookTitle.toLowerCase();
        }
        if (typeof bookAuthor !== 'number') {
            bookAuthor = bookAuthor.toLowerCase();
        }
        store.add({
            bookID: book.bookID,
            title: bookTitle,
            titleOrg: bookTitleOrg,
            authors: bookAuthor,
            authorsOrg: bookAuthorOrg,
            average_rating: book.average_rating,
            isbn: book.isbn,
            language_code: book.language_code,
            ratings_count: book.ratings_count,
            price: book.price
        });
    }

    tx.oncomplete = function () {
        console.log('book addition complete')
        getAndDisplayBooks(db);
    };
}


// getAndDisplayBooks retrieves all books in the books object store using an
// IndexedDB cursor and sends them to displayBooks so they can be displayed
function getAndDisplayBooks(db, searchStr, sortType) {
    const tx = db.transaction(['books'], 'readonly');
    const store = tx.objectStore('books');
    let index;
    index = store.index('bookID');
    let searchStrRange = null;
    if (searchStr) {
        searchStrRange = IDBKeyRange.bound(searchStr, searchStr + '\uffff');
        index = store.index('title');
    }
    let req;
    req = index.openCursor(searchStrRange, 'next');
    if (sortType) {
        index = store.index(sortType);
        req = index.openCursor(searchStrRange, 'prev');
    }
    let allBooks = [];

    req.onsuccess = function (event) {
        const cursor = event.target.result;

        if (cursor != null) {
            allBooks.push(cursor.value);
            cursor.continue();
        } else {
            displayBooks(allBooks);
        }
    }

    req.onerror = function (event) {
        alert('error in cursor request ' + event.target.errorCode);
    }
}

// displayBooks takes in an array of  book objects and displays them
function displayBooks(data) {
    const starTotal = 5;
    let bookCard = '';
    for (const book of data) {
        const starPercentage = (book.average_rating / starTotal) * 100;
        const starPercentageRounded = `${(Math.round(starPercentage / 10) * 10)}%`;
        bookCard += `  <div class="col-12 col-sm-8 col-md-6 col-lg-4 d-flex">
      <div class="card">
          <div class="card-body">
              <h4 class="card-title">${book.titleOrg}</h4>
              <h6 class="card-subtitle mb-2 text-muted">Book Id: ${book.bookID}</h6>
              <h6 class="card-subtitle mb-2 text-muted">Author: ${book.authorsOrg}</h6>
              <p class="card-text">Language: ${book.language_code}</p>
              <div class="stars-outer">
              <div class="stars-inner" style="width:${starPercentageRounded}"></div>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                  <div class="price text-success">
                      <h5 class="mt-4">$${book.price}</h5>
                  </div>
                  <a href="#" class="btn btn-danger mt-3" data-value= ${book.bookID} onclick="addToCart(event)">Add to Cart</a>
              </div>
          </div>
      </div>
  </div>`;
    }
    hideloader();
    document.getElementById("bookList").innerHTML = bookCard;
}

function displayCartBooks(data) {
    document.getElementById("viewCartTable").innerHTML = '';
    document.getElementById("cartTotal").innerText = '';
    let bookCard = '';
    let cartTotal = 0;
    for (const book of data) {
        cartTotal += book.price;
        bookCard += `
        <tr id= book${book.bookID}>
        <td>${book.titleOrg}</td>
        <td>${book.authorsOrg}</td>
        <td>${book.language_code}</td>
        <td>${book.average_rating}</td>
        <td>$${book.price}</td>
        <td>
            <a href="#" class="btn btn-danger btn-sm" data-value= ${book.bookID} onclick="deleteFromCart(event)">
                <i class="fa fa-times"></i>
            </a>
        </td>
    </tr>`;
    }
    document.getElementById("viewCartTable").innerHTML = bookCard;
    document.getElementById("cartTotal").innerText = `$${cartTotal}`;
}

function getBookID(db, id) {
    const tx = db.transaction(['books'], 'readonly');
    const store = tx.objectStore('books');
    const index = store.index('bookID');
    const req = index.openCursor(IDBKeyRange.only(id), 'next');
    let bookObj = {};

    req.onsuccess = function (event) {
        let cursor = event.target.result;

        if (cursor != null) {
            bookObj = cursor.value
            cursor.continue();
        } else {
            addBookToCart(db, bookObj);
        }
    }

    req.onerror = function (event) {
        alert('error in cursor request ' + event.target.errorCode);
    }
}

function addBookToCart(db, book) {
    const tx = db.transaction(['cart'], 'readwrite');
    const store = tx.objectStore('cart');
    store.add(book)
    tx.oncomplete = function () {
        console.log('book added to cart')
        getCart(db);
    };
}

function searchBooks() {
    document.getElementById("bookList").innerHTML = '';
    showloader();
    const searchStr = document.getElementById("searchBook").value.toLowerCase();
    getAndDisplayBooks(db, searchStr);
}

function addToCart(e) {
    const bookID = parseInt(e.target.getAttribute('data-value'));
    getBookID(db, bookID);
}

function getCart(db) {
    const tx = db.transaction(['cart'], 'readonly');
    const store = tx.objectStore('cart');
    const index = store.index('bookID');
    const countRequest = index.count();
    let cartCount;
    countRequest.onsuccess = function () {
        if (countRequest.result === 0) {
            cartCount = 0;
            document.getElementById("cartCount").innerText = cartCount;
            document.getElementById("viewCartTable").innerHTML = '';
            document.getElementById("cartTotal").innerText = `$0`;
        } else {
            const req = index.openCursor(null, 'next');
            const allBooks = [];
            cartCount = countRequest.result;
            document.getElementById("cartCount").innerText = cartCount;
            req.onsuccess = function (event) {
                const cursor = event.target.result;
                if (cursor != null) {
                    allBooks.push(cursor.value);
                    cursor.continue();
                } else {
                    displayCartBooks(allBooks);
                }
            }


            req.onerror = function (event) {
                alert('error in cursor request ' + event.target.errorCode);
            }
        }
    }
    countRequest.onerror = function (event) {
        alert('error in cursor request ' + event.target.errorCode);
    }
}

function hideloader() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('loadingText').style.display = 'none';
    document.getElementById('booklistSection').style.display = 'block';
    document.getElementById('navbar').style.display = 'block';
}

function showloader() {
    document.getElementById('loading').style.display = 'block';
}

function sortBooklist(sel) {
    document.getElementById("bookList").innerHTML = '';
    showloader();
    const sortType = sel.options[sel.selectedIndex].value;
    getAndDisplayBooks(db, '', sortType);

}

function deleteFromCart(e) {
    const bookID = parseInt(e.target.getAttribute('data-value'));
    const element = document.getElementById(`book${bookID}`);
    element.remove();
    const tx = db.transaction(['cart'], 'readwrite');
    const store = tx.objectStore('cart');
    const index = store.index('bookID');
    const req = index.getKey(bookID);
    req.onsuccess = function () {
        let id = req.result;
        store.delete(id);
        getCart(db)
    };
}